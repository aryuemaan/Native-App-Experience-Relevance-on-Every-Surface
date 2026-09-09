package hr.psk.pulse.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

object Config {
    const val DEFAULT_GATEWAY = "http://10.0.2.2:8080"
    val GATEWAY_KEY = stringPreferencesKey("gateway_url")
    val USER_KEY = stringPreferencesKey("user_id")
    const val DEFAULT_USER = "marek"
}

val Context.dataStore by preferencesDataStore(name = "psk_pulse")

class PulseStore(private val context: Context) {

    private val homeKey = stringPreferencesKey("w_home")
    private val awayKey = stringPreferencesKey("w_away")
    private val scoreKey = stringPreferencesKey("w_score")
    private val minuteKey = intPreferencesKey("w_minute")
    private val cashoutKey = stringPreferencesKey("w_cashout")
    private val slipKey = stringPreferencesKey("w_slip")
    private val boostKey = stringPreferencesKey("w_boost")
    private val liveKey = booleanPreferencesKey("w_live")

    val gatewayUrl: Flow<String> =
        context.dataStore.data.map { it[Config.GATEWAY_KEY] ?: Config.DEFAULT_GATEWAY }

    val userId: Flow<String> =
        context.dataStore.data.map { it[Config.USER_KEY] ?: Config.DEFAULT_USER }

    suspend fun setGateway(url: String) =
        context.dataStore.edit { it[Config.GATEWAY_KEY] = url }

    suspend fun setUser(id: String) =
        context.dataStore.edit { it[Config.USER_KEY] = id }

    suspend fun writeMatch(state: LiveState) {
        context.dataStore.edit {
            it[homeKey] = state.home
            it[awayKey] = state.away
            it[scoreKey] = "${state.homeScore}:${state.awayScore}"
            it[minuteKey] = state.minute
            it[cashoutKey] = String.format("%.2f", state.cashoutValue)
            it[liveKey] = state.active && !state.settled
            it[slipKey] = if (state.settled) "namiren" else if (state.active) "uzivo" else "nema"
        }
    }

    suspend fun writeBoost(label: String?) {
        context.dataStore.edit {
            if (label == null) it.remove(boostKey) else it[boostKey] = label
        }
    }

    data class WidgetSnapshot(
        val home: String,
        val away: String,
        val score: String,
        val minute: Int,
        val cashout: String,
        val slip: String,
        val boost: String?,
        val live: Boolean
    )

    val widgetSnapshot: Flow<WidgetSnapshot> = context.dataStore.data.map {
        WidgetSnapshot(
            home = it[homeKey] ?: "Dinamo",
            away = it[awayKey] ?: "Hajduk",
            score = it[scoreKey] ?: "0:0",
            minute = it[minuteKey] ?: 0,
            cashout = it[cashoutKey] ?: "0.00",
            slip = it[slipKey] ?: "nema",
            boost = it[boostKey],
            live = it[liveKey] ?: false
        )
    }
}
