package hr.psk.pulse.data

import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.util.concurrent.TimeUnit

class GatewayClient(private val baseUrl: String) {

    private val json = Json { ignoreUnknownKeys = true }
    private val http = OkHttpClient.Builder()
        .pingInterval(20, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build()
    private val jsonMedia = "application/json".toMediaType()

    fun moments(userId: String): Flow<Moment> = callbackFlow {
        val wsUrl = baseUrl.replaceFirst("http", "ws") + "/stream?userId=$userId"
        val request = Request.Builder().url(wsUrl).build()
        val listener = object : WebSocketListener() {
            override fun onMessage(webSocket: WebSocket, text: String) {
                val env = runCatching { json.decodeFromString<MomentEnvelope>(text) }.getOrNull()
                if (env?.type == "moment" && env.moment != null) trySend(env.moment)
            }
            override fun onFailure(webSocket: WebSocket, t: Throwable, r: okhttp3.Response?) {
                close(t)
            }
        }
        val socket = http.newWebSocket(request, listener)
        awaitClose { socket.cancel() }
    }

    suspend fun matches(): List<MatchListItem> = get("/api/matches")

    suspend fun users(): List<UserRef> = get("/api/users")

    suspend fun slip(userId: String): SlipStatus = get("/api/users/$userId/slip")

    suspend fun audit(userId: String): List<AuditRecord> = get("/api/users/$userId/audit")

    fun startScenario(userId: String) = post("/api/demo/$userId/scenario")

    fun sendBoost(userId: String) = post("/api/demo/$userId/boost")

    fun sendPushyPromo(userId: String) = post("/api/demo/$userId/pushy-promo")

    fun cashout(userId: String) = post("/api/users/$userId/cashout")

    fun nearShop(userId: String) =
        postBody("/api/users/$userId/context/location", "{\"context\":\"near_shop\"}")

    fun setConsentMarketing(userId: String, value: Boolean) =
        putBody("/api/users/$userId/consent", "{\"marketing\":$value}")

    fun setSelfExcluded(userId: String, value: Boolean) =
        putBody("/api/users/$userId/rg", "{\"selfExcluded\":$value}")

    fun setDepositLimit(userId: String, value: Boolean) =
        putBody("/api/users/$userId/rg", "{\"depositLimitReached\":$value}")

    fun setKyc(userId: String, value: Boolean) =
        putBody("/api/users/$userId/account", "{\"kycVerified\":$value}")

    private inline fun <reified T> get(path: String): T {
        http.newCall(Request.Builder().url(baseUrl + path).build()).execute().use { r ->
            val body = r.body?.string() ?: "null"
            return json.decodeFromString(body)
        }
    }

    private fun post(path: String) {
        runCatching {
            http.newCall(
                Request.Builder().url(baseUrl + path)
                    .post(ByteArray(0).toRequestBody()).build()
            ).execute().close()
        }
    }

    private fun postBody(path: String, body: String) {
        runCatching {
            http.newCall(
                Request.Builder().url(baseUrl + path)
                    .post(body.toRequestBody(jsonMedia)).build()
            ).execute().close()
        }
    }

    private fun putBody(path: String, body: String) {
        runCatching {
            http.newCall(
                Request.Builder().url(baseUrl + path)
                    .put(body.toRequestBody(jsonMedia)).build()
            ).execute().close()
        }
    }
}
