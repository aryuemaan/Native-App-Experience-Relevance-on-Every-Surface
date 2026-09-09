package hr.psk.pulse.ui.component

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import hr.psk.pulse.ui.theme.PskGreen
import hr.psk.pulse.ui.theme.PskLime
import hr.psk.pulse.ui.theme.PskMuted
import hr.psk.pulse.ui.theme.PskRed
import hr.psk.pulse.ui.theme.PskSurface
import hr.psk.pulse.ui.theme.PskText

@Composable
fun SiriSheet(text: String, onDismiss: () -> Unit) {
    Box(
        Modifier.fillMaxSize().background(Color(0xCC000000)).clickable { onDismiss() },
        contentAlignment = Alignment.Center
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(24.dp)
                .clip(RoundedCornerShape(24.dp))
                .background(PskSurface)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                Modifier.size(64.dp).clip(CircleShape).background(
                    Brush.sweepGradient(listOf(PskGreen, PskLime, PskRed, PskGreen))
                )
            )
            Spacer(Modifier.height(14.dp))
            Text("Koji je status mog listica?", color = PskMuted, fontSize = 13.sp)
            Spacer(Modifier.height(8.dp))
            Text(text, color = PskText, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(18.dp))
            Button(
                onClick = onDismiss,
                colors = ButtonDefaults.buttonColors(containerColor = PskRed, contentColor = PskText),
                shape = RoundedCornerShape(14.dp)
            ) { Text("Zatvori", fontWeight = FontWeight.Bold) }
        }
    }
}
