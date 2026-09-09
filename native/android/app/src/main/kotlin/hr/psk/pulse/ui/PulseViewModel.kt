package hr.psk.pulse.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import hr.psk.pulse.data.AuditRecord
import hr.psk.pulse.data.GatewayClient
import hr.psk.pulse.data.LiveState
import hr.psk.pulse.data.MatchListItem
import hr.psk.pulse.data.Moment
import hr.psk.pulse.data.PulseStore
import hr.psk.pulse.data.UserRef
import hr.psk.pulse.live.LiveUpdateService
import hr.psk.pulse.widget.PulseWidgets
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.jsonPrimitive

data class UiState(
    val users: List<UserRef> = emptyList(),
    val matches: List<MatchListItem> = emptyList(),
    val userId: String = "marek",
    val gateway: String = "http://10.0.2.2:8080",
    val connected: Boolean = false,
    val live: LiveState = LiveState(),
    val boostLabel: String? = null,
    val audit: List<AuditRecord> = emptyList(),
    val siriText: String? = null
)

class PulseViewModel(app: Application) : AndroidViewModel(app) {

    private val store = PulseStore(app)
    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state

    private var streamJob: Job? = null
    private var pollJob: Job? = null

    private fun client() = GatewayClient(_state.value.gateway)

    init {
        viewModelScope.launch {
            val gw = store.gatewayUrl.first()
            val uid = store.userId.first()
            _state.value = _state.value.copy(gateway = gw, userId = uid)
            bootstrap()
        }
    }

    private fun bootstrap() {
        viewModelScope.launch {
            runCatching {
                val users = withContext(Dispatchers.IO) { client().users() }
                val matches = withContext(Dispatchers.IO) { client().matches() }
                _state.value = _state.value.copy(users = users, matches = matches)
            }
            connect()
            startAuditPoll()
        }
    }

    private fun connect() {
        streamJob?.cancel()
        val uid = _state.value.userId
        streamJob = viewModelScope.launch {
            client().moments(uid)
                .catch { _state.value = _state.value.copy(connected = false) }
                .collect { onMoment(it) }
        }
        _state.value = _state.value.copy(connected = true)
    }

    private fun startAuditPoll() {
        pollJob?.cancel()
        pollJob = viewModelScope.launch {
            while (true) {
                runCatching {
                    val a = withContext(Dispatchers.IO) { client().audit(_state.value.userId) }
                    _state.value = _state.value.copy(audit = a)
                }
                delay(1500)
            }
        }
    }

    private suspend fun onMoment(m: Moment) {
        val d = m.data
        fun i(k: String, f: Int) = d[k]?.jsonPrimitive?.content?.toDoubleOrNull()?.toInt() ?: f
        fun db(k: String, f: Double) = d[k]?.jsonPrimitive?.content?.toDoubleOrNull() ?: f
        fun s(k: String, f: String) = d[k]?.jsonPrimitive?.content ?: f

        when (m.kind) {
            "live_activity_start", "score_update", "odds_move", "cashout_window" -> {
                val prev = _state.value.live.cashoutValue
                val next = db("liveValue", prev)
                val live = _state.value.live.copy(
                    active = true, settled = false,
                    home = s("home", _state.value.live.home),
                    away = s("away", _state.value.live.away),
                    homeScore = i("homeScore", _state.value.live.homeScore),
                    awayScore = i("awayScore", _state.value.live.awayScore),
                    minute = i("minute", _state.value.live.minute),
                    cashoutValue = next, valueUp = next >= prev
                )
                _state.value = _state.value.copy(live = live)
                store.writeMatch(live)
            }
            "ticket_settled" -> {
                val live = _state.value.live.copy(settled = true, cashoutValue = db("payout", _state.value.live.cashoutValue))
                _state.value = _state.value.copy(live = live)
                store.writeMatch(live)
            }
            "boost_offer" -> {
                _state.value = _state.value.copy(boostLabel = m.title)
                store.writeBoost(m.title)
            }
            else -> Unit
        }
        PulseWidgets.refresh(getApplication())
    }

    fun selectUser(id: String) {
        viewModelScope.launch { store.setUser(id) }
        _state.value = _state.value.copy(userId = id, live = LiveState(), boostLabel = null, audit = emptyList())
        connect()
        startAuditPoll()
    }

    fun setGateway(url: String) {
        viewModelScope.launch { store.setGateway(url) }
        _state.value = _state.value.copy(gateway = url)
        bootstrap()
    }

    fun startMatch() {
        val s = _state.value
        io { client().startScenario(s.userId) }
        LiveUpdateService.start(getApplication(), s.userId, s.gateway)
    }

    fun sendBoost() = io { client().sendBoost(_state.value.userId) }
    fun pushyPromo() = io { client().sendPushyPromo(_state.value.userId) }
    fun nearShop() = io { client().nearShop(_state.value.userId) }
    fun cashout() = io { client().cashout(_state.value.userId) }

    fun setMarketing(v: Boolean) = io { client().setConsentMarketing(_state.value.userId, v) }
    fun setSelfExcluded(v: Boolean) = io { client().setSelfExcluded(_state.value.userId, v) }
    fun setDepositLimit(v: Boolean) = io { client().setDepositLimit(_state.value.userId, v) }
    fun setKyc(v: Boolean) = io { client().setKyc(_state.value.userId, v) }

    fun askSiri() {
        viewModelScope.launch {
            val spoken = runCatching { withContext(Dispatchers.IO) { client().slip(_state.value.userId).spoken } }
                .getOrDefault("Listic trenutno nije dostupan.")
            _state.value = _state.value.copy(siriText = spoken)
        }
    }

    fun dismissSiri() { _state.value = _state.value.copy(siriText = null) }

    private fun io(block: suspend () -> Unit) {
        viewModelScope.launch { withContext(Dispatchers.IO) { runCatching { block() } } }
    }
}
