package hr.psk.pulse.live

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.ServiceCompat
import hr.psk.pulse.data.Config
import hr.psk.pulse.data.GatewayClient
import hr.psk.pulse.data.LiveState
import hr.psk.pulse.data.Moment
import hr.psk.pulse.data.PulseStore
import hr.psk.pulse.widget.PulseWidgets
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.launch
import kotlinx.serialization.json.jsonPrimitive

class LiveUpdateService : Service() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var streamJob: Job? = null
    private lateinit var store: PulseStore

    private var userId: String = Config.DEFAULT_USER
    private var gateway: String = Config.DEFAULT_GATEWAY
    private var state = LiveState()

    override fun onCreate() {
        super.onCreate()
        store = PulseStore(applicationContext)
        LiveNotification.ensureChannel(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }
        userId = intent?.getStringExtra(EXTRA_USER) ?: userId
        gateway = intent?.getStringExtra(EXTRA_GATEWAY) ?: gateway
        state = state.copy(active = true, settled = false)

        startAsForeground()
        connect()
        return START_STICKY
    }

    private fun startAsForeground() {
        val notif = LiveNotification.build(this, state, userId, gateway)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ServiceCompat.startForeground(
                this, LiveNotification.NOTIF_ID, notif,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            )
        } else {
            ServiceCompat.startForeground(this, LiveNotification.NOTIF_ID, notif, 0)
        }
    }

    private fun connect() {
        streamJob?.cancel()
        val client = GatewayClient(gateway)
        streamJob = scope.launch {
            client.moments(userId)
                .catch { }
                .collect { moment -> onMoment(moment) }
        }
    }

    private suspend fun onMoment(m: Moment) {
        val d = m.data
        fun int(key: String, fallback: Int): Int =
            d[key]?.jsonPrimitive?.content?.toDoubleOrNull()?.toInt() ?: fallback
        fun dbl(key: String, fallback: Double): Double =
            d[key]?.jsonPrimitive?.content?.toDoubleOrNull() ?: fallback
        fun str(key: String, fallback: String): String =
            d[key]?.jsonPrimitive?.content ?: fallback

        when (m.kind) {
            "live_activity_start", "score_update", "odds_move", "cashout_window" -> {
                val prev = state.cashoutValue
                val next = dbl("liveValue", state.cashoutValue)
                state = state.copy(
                    active = true,
                    home = str("home", state.home),
                    away = str("away", state.away),
                    homeScore = int("homeScore", state.homeScore),
                    awayScore = int("awayScore", state.awayScore),
                    minute = int("minute", state.minute),
                    cashoutValue = next,
                    valueUp = next >= prev,
                    settled = false
                )
                push()
            }
            "ticket_settled" -> {
                state = state.copy(
                    settled = true,
                    cashoutValue = dbl("payout", state.cashoutValue),
                    homeScore = int("homeScore", state.homeScore),
                    awayScore = int("awayScore", state.awayScore)
                )
                push()
                delay(30_000)
                stopSelf()
            }
            else -> Unit
        }
    }

    private suspend fun push() {
        val notif = LiveNotification.build(this, state, userId, gateway)
        NotificationManagerCompat.from(this).notify(LiveNotification.NOTIF_ID, notif)
        store.writeMatch(state)
        PulseWidgets.refresh(applicationContext)
    }

    override fun onDestroy() {
        streamJob?.cancel()
        scope.coroutineContext[Job]?.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        const val ACTION_STOP = "hr.psk.pulse.STOP_LIVE"
        const val EXTRA_USER = "user"
        const val EXTRA_GATEWAY = "gateway"

        fun start(context: Context, userId: String, gateway: String) {
            val intent = Intent(context, LiveUpdateService::class.java).apply {
                putExtra(EXTRA_USER, userId)
                putExtra(EXTRA_GATEWAY, gateway)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            context.startService(
                Intent(context, LiveUpdateService::class.java).apply { action = ACTION_STOP }
            )
        }
    }
}
