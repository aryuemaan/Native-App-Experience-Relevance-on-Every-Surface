package hr.psk.pulse.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val PskRed = Color(0xFFE30613)
val PskRedDark = Color(0xFFB00410)
val PskBg = Color(0xFF0B0B0C)
val PskSurface = Color(0xFF16171A)
val PskSurface2 = Color(0xFF1F2126)
val PskText = Color(0xFFF5F6F7)
val PskMuted = Color(0xFF9BA1A8)
val PskGreen = Color(0xFF12B76A)
val PskLime = Color(0xFFB8F84A)
val PskAmber = Color(0xFFF5B32B)

private val PskScheme = darkColorScheme(
    primary = PskRed,
    onPrimary = PskText,
    secondary = PskLime,
    onSecondary = Color(0xFF06130C),
    background = PskBg,
    onBackground = PskText,
    surface = PskSurface,
    onSurface = PskText,
    surfaceVariant = PskSurface2,
    onSurfaceVariant = PskMuted,
    error = PskRed
)

@Composable
fun PskPulseTheme(content: @Composable () -> Unit) {
    isSystemInDarkTheme()
    MaterialTheme(colorScheme = PskScheme, typography = Typography(), content = content)
}
