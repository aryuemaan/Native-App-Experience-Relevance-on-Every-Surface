package hr.psk.pulse

import android.app.Application
import hr.psk.pulse.live.LiveNotification

class PulseApp : Application() {
    override fun onCreate() {
        super.onCreate()
        LiveNotification.ensureChannel(this)
    }
}
