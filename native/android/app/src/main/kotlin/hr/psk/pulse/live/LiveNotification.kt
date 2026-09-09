package hr.psk.pulse.live

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import hr.psk.pulse.MainActivity
import hr.psk.pulse.R
import hr.psk.pulse.data.LiveState

object LiveNotification {

    const val CHANNEL_LIVE = "psk_live"
    const val NOTIF_ID = 4201

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val mgr = context.getSystemService(NotificationManager::class.java)
        if (mgr.getNotificationChannel(CHANNEL_LIVE) != null) return
        val channel = NotificationChannel(
            CHANNEL_LIVE,
            context.getString(R.string.channel_live_name),
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = context.getString(R.string.channel_live_desc)
            setShowBadge(true)
        }
        mgr.createNotificationChannel(channel)
    }

    fun build(context: Context, state: LiveState, userId: String, gateway: String): Notification {
        val collapsed = RemoteViews(context.packageName, R.layout.notif_live_collapsed).apply {
            setTextViewText(R.id.collapsed_teams, "${state.home} - ${state.away}")
            setTextViewText(R.id.collapsed_score, "${state.homeScore}:${state.awayScore}")
            setTextViewText(R.id.collapsed_value, money(state.cashoutValue))
        }

        val expanded = RemoteViews(context.packageName, R.layout.notif_live_expanded).apply {
            setTextViewText(R.id.exp_competition, state.competition)
            setTextViewText(R.id.exp_minute, if (state.settled) "KRAJ" else "${state.minute}'")
            setTextViewText(R.id.exp_home, state.home)
            setTextViewText(R.id.exp_away, state.away)
            setTextViewText(R.id.exp_score, "${state.homeScore} : ${state.awayScore}")
            setTextViewText(R.id.exp_value, money(state.cashoutValue))
            if (state.settled) {
                setTextViewText(R.id.exp_cashout, "Namireno")
                setTextViewText(R.id.exp_value_label, "Isplaceno")
            } else {
                setOnClickPendingIntent(R.id.exp_cashout, cashoutIntent(context, userId, gateway))
            }
        }

        return NotificationCompat.Builder(context, CHANNEL_LIVE)
            .setSmallIcon(R.drawable.ic_stat_pulse)
            .setStyle(NotificationCompat.DecoratedCustomViewStyle())
            .setCustomContentView(collapsed)
            .setCustomBigContentView(expanded)
            .setColor(Color.parseColor("#E30613"))
            .setColorized(true)
            .setCategory(NotificationCompat.CATEGORY_EVENT)
            .setOngoing(!state.settled)
            .setOnlyAlertOnce(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(openAppIntent(context))
            .build()
    }

    private fun money(v: Double): String = String.format("%.2f EUR", v).replace('.', ',')

    private fun openAppIntent(context: Context): PendingIntent {
        val intent = Intent(context, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
        return PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun cashoutIntent(context: Context, userId: String, gateway: String): PendingIntent {
        val intent = Intent(context, CashOutReceiver::class.java).apply {
            action = CashOutReceiver.ACTION_CASHOUT
            putExtra(CashOutReceiver.EXTRA_USER, userId)
            putExtra(CashOutReceiver.EXTRA_GATEWAY, gateway)
        }
        return PendingIntent.getBroadcast(
            context, 1, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}
