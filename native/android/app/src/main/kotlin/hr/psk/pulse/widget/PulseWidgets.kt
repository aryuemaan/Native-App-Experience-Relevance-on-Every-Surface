package hr.psk.pulse.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.updateAll
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.defaultWeight
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import hr.psk.pulse.data.PulseStore
import kotlinx.coroutines.flow.first

private val BG = Color(0xFF16171A)
private val TEXT = Color(0xFFF5F6F7)
private val MUTED = Color(0xFF9BA1A8)
private val RED = Color(0xFFE30613)
private val LIME = Color(0xFFB8F84A)
private val AMBER = Color(0xFFF5B32B)

private suspend fun snapshot(context: Context): PulseStore.WidgetSnapshot =
    PulseStore(context).widgetSnapshot.first()

object PulseWidgets {
    suspend fun refresh(context: Context) {
        TeamsWidget().updateAll(context)
        SlipWidget().updateAll(context)
        BoostWidget().updateAll(context)
    }
}

class TeamsWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val s = snapshot(context)
        provideContent {
            Column(
                GlanceModifier.fillMaxSize().background(BG).padding(14.dp)
            ) {
                Row(GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text("UZIVO", style = TextStyle(color = androidx.glance.unit.ColorProvider(RED), fontSize = 11.sp, fontWeight = FontWeight.Bold))
                    Spacer(GlanceModifier.defaultWeight())
                    Text("${s.minute}'", style = TextStyle(color = androidx.glance.unit.ColorProvider(MUTED), fontSize = 11.sp))
                }
                Spacer(GlanceModifier.height(8.dp))
                Text(s.home, style = TextStyle(color = androidx.glance.unit.ColorProvider(TEXT), fontSize = 16.sp, fontWeight = FontWeight.Bold))
                Text(s.away, style = TextStyle(color = androidx.glance.unit.ColorProvider(TEXT), fontSize = 16.sp, fontWeight = FontWeight.Bold))
                Spacer(GlanceModifier.height(6.dp))
                Text(s.score, style = TextStyle(color = androidx.glance.unit.ColorProvider(LIME), fontSize = 22.sp, fontWeight = FontWeight.Bold))
            }
        }
    }
}

class SlipWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val s = snapshot(context)
        provideContent {
            Column(
                GlanceModifier.fillMaxSize().background(BG).padding(14.dp)
            ) {
                Text("MOJ LISTIC", style = TextStyle(color = androidx.glance.unit.ColorProvider(MUTED), fontSize = 11.sp, fontWeight = FontWeight.Bold))
                Spacer(GlanceModifier.height(6.dp))
                Text("Isplata ${s.cashout} EUR", style = TextStyle(color = androidx.glance.unit.ColorProvider(LIME), fontSize = 18.sp, fontWeight = FontWeight.Bold))
                Spacer(GlanceModifier.height(4.dp))
                Text("${s.slip} - ${s.home} ${s.score}", style = TextStyle(color = androidx.glance.unit.ColorProvider(TEXT), fontSize = 12.sp))
            }
        }
    }
}

class BoostWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val s = snapshot(context)
        provideContent {
            Column(
                GlanceModifier.fillMaxSize().background(BG).padding(14.dp)
            ) {
                Text("BOOST ZA TEBE", style = TextStyle(color = androidx.glance.unit.ColorProvider(AMBER), fontSize = 11.sp, fontWeight = FontWeight.Bold))
                Spacer(GlanceModifier.height(6.dp))
                Text(
                    s.boost ?: "Trenutno nema boosta",
                    style = TextStyle(color = androidx.glance.unit.ColorProvider(TEXT), fontSize = 14.sp, fontWeight = FontWeight.Bold)
                )
            }
        }
    }
}

class TeamsWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = TeamsWidget()
}
class SlipWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = SlipWidget()
}
class BoostWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = BoostWidget()
}
