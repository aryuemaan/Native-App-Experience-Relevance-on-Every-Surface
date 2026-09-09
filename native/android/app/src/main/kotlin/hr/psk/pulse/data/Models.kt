package hr.psk.pulse.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class Surface {
    @SerialName("watch") WATCH,
    @SerialName("widget") WIDGET,
    @SerialName("quick_action") QUICK_ACTION,
    @SerialName("live_activity") LIVE_ACTIVITY,
    @SerialName("dynamic_island") DYNAMIC_ISLAND,
    @SerialName("push") PUSH
}

@Serializable
enum class ContentClass {
    @SerialName("informational") INFORMATIONAL,
    @SerialName("inducement") INDUCEMENT
}

@Serializable
enum class WidgetFamily {
    @SerialName("slip") SLIP,
    @SerialName("teams") TEAMS,
    @SerialName("boost") BOOST
}

@Serializable
data class Reason(val code: String, val message: String)

@Serializable
data class Moment(
    val id: String,
    val userId: String,
    val kind: String,
    val contentClass: ContentClass,
    val surface: Surface,
    val widgetFamily: WidgetFamily? = null,
    val title: String,
    val body: String,
    val data: Map<String, kotlinx.serialization.json.JsonElement> = emptyMap(),
    val reasons: List<Reason> = emptyList(),
    val createdAt: String
)

@Serializable
data class MomentEnvelope(val type: String, val moment: Moment? = null)

@Serializable
data class MatchOdds(val home: Double, val draw: Double, val away: Double)

@Serializable
data class MatchListItem(
    val id: String,
    val competition: String,
    val home: String,
    val away: String,
    val homeId: String,
    val awayId: String,
    val minute: Int,
    val homeScore: Int,
    val awayScore: Int,
    val live: Boolean,
    val kickoff: String,
    val odds: MatchOdds
)

@Serializable
data class UserRef(val id: String, val name: String)

@Serializable
data class SlipStatus(val spoken: String)

@Serializable
data class AuditRecord(
    val id: String,
    val kind: String,
    val contentClass: ContentClass,
    val allowed: Boolean,
    val surface: Surface? = null,
    val widgetFamily: WidgetFamily? = null,
    val reasons: List<Reason> = emptyList(),
    val createdAt: String
)

data class LiveState(
    val active: Boolean = false,
    val home: String = "Dinamo",
    val away: String = "Hajduk",
    val homeScore: Int = 0,
    val awayScore: Int = 0,
    val minute: Int = 0,
    val competition: String = "SuperSport HNL",
    val cashoutValue: Double = 0.0,
    val valueUp: Boolean = true,
    val settled: Boolean = false
)
