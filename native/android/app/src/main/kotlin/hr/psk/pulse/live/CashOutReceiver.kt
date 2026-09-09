package hr.psk.pulse.live

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import hr.psk.pulse.data.Config
import hr.psk.pulse.data.GatewayClient
import kotlin.concurrent.thread

class CashOutReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_CASHOUT) return
        val userId = intent.getStringExtra(EXTRA_USER) ?: Config.DEFAULT_USER
        val gateway = intent.getStringExtra(EXTRA_GATEWAY) ?: Config.DEFAULT_GATEWAY
        val pending = goAsync()
        thread {
            runCatching { GatewayClient(gateway).cashout(userId) }
            pending.finish()
        }
    }

    companion object {
        const val ACTION_CASHOUT = "hr.psk.pulse.CASHOUT"
        const val EXTRA_USER = "user"
        const val EXTRA_GATEWAY = "gateway"
    }
}
