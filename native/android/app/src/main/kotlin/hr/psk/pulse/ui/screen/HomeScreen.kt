package hr.psk.pulse.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import hr.psk.pulse.data.MatchListItem
import hr.psk.pulse.ui.PulseViewModel
import hr.psk.pulse.ui.component.SiriSheet
import hr.psk.pulse.ui.theme.PskAmber
import hr.psk.pulse.ui.theme.PskBg
import hr.psk.pulse.ui.theme.PskGreen
import hr.psk.pulse.ui.theme.PskLime
import hr.psk.pulse.ui.theme.PskMuted
import hr.psk.pulse.ui.theme.PskRed
import hr.psk.pulse.ui.theme.PskSurface
import hr.psk.pulse.ui.theme.PskSurface2
import hr.psk.pulse.ui.theme.PskText

@Composable
fun HomeScreen(vm: PulseViewModel, modifier: Modifier = Modifier) {
    val s by vm.state.collectAsState()

    Column(
        modifier
            .fillMaxSize()
            .background(PskBg)
            .verticalScroll(rememberScrollState())
            .padding(bottom = 24.dp)
    ) {
        TopBar(connected = s.connected)

        UserRow(
            users = s.users.map { it.id to it.name },
            selected = s.userId,
            onSelect = vm::selectUser
        )

        LiveSurfaceCard(
            live = s.live,
            boost = s.boostLabel,
            onCashout = vm::cashout
        )

        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Button(
                onClick = vm::startMatch,
                modifier = Modifier.weight(1f),
                colors = ButtonDefaults.buttonColors(containerColor = PskRed, contentColor = PskText),
                shape = RoundedCornerShape(14.dp)
            ) { Text("Prati uzivo", fontWeight = FontWeight.Bold) }

            OutlinedButton(
                onClick = vm::askSiri,
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(14.dp)
            ) { Text("Glasovni listic") }
        }

        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            OutlinedButton(onClick = vm::sendBoost, modifier = Modifier.weight(1f), shape = RoundedCornerShape(14.dp)) {
                Text("Posalji boost")
            }
            OutlinedButton(onClick = vm::nearShop, modifier = Modifier.weight(1f), shape = RoundedCornerShape(14.dp)) {
                Text("Blizu poslovnice")
            }
        }

        SectionTitle("Uzivo - SuperSport HNL")
        s.matches.forEach { MatchRow(it) }

        SectionTitle("Care Gate - zastite")
        ConsoleCard(vm)

        SectionTitle("Dnevnik odluka")
        DecisionLog(s.audit.map { Triple(it.kind, it.contentClass.name, if (it.allowed) "-> ${it.surface?.name?.lowercase()}" else "blokirano") to (it.reasons.firstOrNull()?.message ?: "") })
    }

    s.siriText?.let { SiriSheet(text = it, onDismiss = vm::dismissSiri) }
}

@Composable
private fun TopBar(connected: Boolean) {
    Row(
        Modifier.fillMaxWidth().background(PskBg).padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            Modifier.size(30.dp).clip(RoundedCornerShape(8.dp)).background(PskRed),
            contentAlignment = Alignment.Center
        ) { Text("PSK", color = PskText, fontSize = 10.sp, fontWeight = FontWeight.Black) }
        Spacer(Modifier.width(10.dp))
        Text("Pulse", color = PskText, fontSize = 20.sp, fontWeight = FontWeight.Black)
        Spacer(Modifier.weight(1f))
        Box(Modifier.size(8.dp).clip(CircleShape).background(if (connected) PskGreen else PskMuted))
        Spacer(Modifier.width(6.dp))
        Text(if (connected) "uzivo" else "spajanje", color = PskMuted, fontSize = 12.sp)
    }
}

@Composable
private fun UserRow(users: List<Pair<String, String>>, selected: String, onSelect: (String) -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        users.forEach { (id, name) ->
            val active = id == selected
            Box(
                Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (active) PskRed else PskSurface2)
                    .clickable { onSelect(id) }
                    .padding(vertical = 10.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(name, color = PskText, fontSize = 13.sp, fontWeight = if (active) FontWeight.Bold else FontWeight.Normal)
            }
        }
    }
}

@Composable
private fun LiveSurfaceCard(live: hr.psk.pulse.data.LiveState, boost: String?, onCashout: () -> Unit) {
    Card(
        Modifier.fillMaxWidth().padding(16.dp),
        colors = CardDefaults.cardColors(containerColor = PskSurface),
        shape = RoundedCornerShape(20.dp)
    ) {
        Column(Modifier.padding(16.dp)) {
            if (!live.active) {
                Text("Live Update pregled", color = PskMuted, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp))
                Text("Pokreni pracenje da ozivis povrsine ->", color = PskMuted, fontSize = 14.sp)
            } else {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.clip(RoundedCornerShape(8.dp)).background(PskRed).padding(horizontal = 8.dp, vertical = 2.dp)) {
                        Text("UZIVO", color = PskText, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.weight(1f))
                    Text(if (live.settled) "KRAJ" else "${live.minute}'", color = PskMuted, fontSize = 12.sp)
                }
                Spacer(Modifier.height(10.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(live.home, color = PskText, fontSize = 16.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                    Text("${live.homeScore} : ${live.awayScore}", color = PskText, fontSize = 24.sp, fontWeight = FontWeight.Black)
                    Text(live.away, color = PskText, fontSize = 16.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f), textAlign = androidx.compose.ui.text.style.TextAlign.End)
                }
                Spacer(Modifier.height(14.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Isplata", color = PskMuted, fontSize = 12.sp)
                        Text(
                            money(live.cashoutValue) + if (live.valueUp) "  ^" else "  v",
                            color = PskLime, fontSize = 20.sp, fontWeight = FontWeight.Black
                        )
                    }
                    if (!live.settled) {
                        Button(
                            onClick = onCashout,
                            colors = ButtonDefaults.buttonColors(containerColor = PskLime, contentColor = Color(0xFF06130C)),
                            shape = RoundedCornerShape(14.dp)
                        ) { Text("Isplati", fontWeight = FontWeight.Black) }
                    } else {
                        Text("Namireno", color = PskLime, fontWeight = FontWeight.Bold)
                    }
                }
            }

            if (boost != null) {
                Spacer(Modifier.height(14.dp))
                Box(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(PskSurface2).padding(12.dp)) {
                    Column {
                        Text("BOOST ZA TEBE", color = PskAmber, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(4.dp))
                        Text(boost, color = PskText, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun MatchRow(m: MatchListItem) {
    Card(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
        colors = CardDefaults.cardColors(containerColor = PskSurface),
        shape = RoundedCornerShape(14.dp)
    ) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (m.live) {
                        Box(Modifier.clip(RoundedCornerShape(6.dp)).background(PskRed).padding(horizontal = 6.dp, vertical = 1.dp)) {
                            Text("${m.minute}'", color = PskText, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }
                        Spacer(Modifier.width(8.dp))
                    }
                    Text(m.competition, color = PskMuted, fontSize = 11.sp)
                }
                Spacer(Modifier.height(6.dp))
                Text("${m.home}  ${m.homeScore}:${m.awayScore}  ${m.away}", color = PskText, fontSize = 14.sp, fontWeight = FontWeight.Bold)
            }
            Odds("1", m.odds.home)
            Odds("X", m.odds.draw)
            Odds("2", m.odds.away)
        }
    }
}

@Composable
private fun Odds(label: String, value: Double) {
    Box(
        Modifier.padding(start = 6.dp).width(52.dp).clip(RoundedCornerShape(10.dp)).background(PskSurface2).padding(vertical = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(label, color = PskMuted, fontSize = 10.sp)
            Text(String.format("%.2f", value), color = PskText, fontSize = 13.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun ConsoleCard(vm: PulseViewModel) {
    val s by vm.state.collectAsState()
    Card(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        colors = CardDefaults.cardColors(containerColor = PskSurface),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(Modifier.padding(12.dp)) {
            ToggleRow("Marketing privola", "off blokira boostove") { vm.setMarketing(it) }
            ToggleRow("Samoisključenje", "boostovi blokirani, rezultat teče") { vm.setSelfExcluded(it) }
            ToggleRow("Limit uplate dosegnut", "boostovi blokirani po dizajnu") { vm.setDepositLimit(it) }
            ToggleRow("KYC verificiran", "off = nijedna povrsina ne postoji", initial = true) { vm.setKyc(it) }
            Spacer(Modifier.height(6.dp))
            OutlinedButton(onClick = vm::pushyPromo, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)) {
                Text("Probaj agresivnu promo (biti ce odbijena)", color = PskAmber)
            }
        }
    }
}

@Composable
private fun ToggleRow(label: String, hint: String, initial: Boolean = false, onChange: (Boolean) -> Unit) {
    var checked by remember { mutableStateOf(initial) }
    Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(label, color = PskText, fontSize = 14.sp, fontWeight = FontWeight.Bold)
            Text(hint, color = PskMuted, fontSize = 11.sp)
        }
        Switch(
            checked = checked,
            onCheckedChange = { checked = it; onChange(it) },
            colors = SwitchDefaults.colors(checkedTrackColor = PskGreen, checkedThumbColor = PskText)
        )
    }
}

@Composable
private fun DecisionLog(rows: List<Pair<Triple<String, String, String>, String>>) {
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
        if (rows.isEmpty()) {
            Text("Jos nema odluka.", color = PskMuted, fontSize = 12.sp)
        }
        rows.take(8).forEach { (head, reason) ->
            val (kind, cls, verdict) = head
            val blocked = verdict == "blokirano"
            Card(
                Modifier.fillMaxWidth().padding(vertical = 4.dp),
                colors = CardDefaults.cardColors(containerColor = PskSurface),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(Modifier.padding(10.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(kind, color = PskText, fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                        Text(cls.lowercase(), color = if (cls == "INDUCEMENT") PskAmber else PskMuted, fontSize = 10.sp)
                        Spacer(Modifier.width(8.dp))
                        Text(verdict, color = if (blocked) PskRed else PskGreen, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                    if (reason.isNotEmpty()) {
                        Text(reason, color = PskMuted, fontSize = 11.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(
        text.uppercase(),
        color = PskMuted,
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(start = 16.dp, top = 18.dp, bottom = 6.dp)
    )
}

private fun money(v: Double): String = String.format("%.2f EUR", v).replace('.', ',')
