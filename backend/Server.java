import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Server {
    private static final int PORT = 8080;

    public static void main(String[] args) throws IOException {
        // Initialize SQLite database
        Database.initDatabase();

        // Create built-in HTTP server on port 8080
        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
        server.createContext("/api/sessions", new SessionsHandler());
        server.setExecutor(null); // default executor
        server.start();
        System.out.println("Java HTTP Server started on http://localhost:" + PORT + "/api/sessions");
    }

    /**
     * Handles /api/sessions routes (GET, POST, DELETE, OPTIONS)
     */
    static class SessionsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            // Apply CORS headers for pre-flight and resource access
            setCorsHeaders(exchange);

            String method = exchange.getRequestMethod();

            // Preflight pre-response handler
            if ("OPTIONS".equalsIgnoreCase(method)) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            try {
                if ("GET".equalsIgnoreCase(method)) {
                    handleGet(exchange);
                } else if ("POST".equalsIgnoreCase(method)) {
                    handlePost(exchange);
                } else if ("DELETE".equalsIgnoreCase(method)) {
                    handleDelete(exchange);
                } else {
                    sendResponse(exchange, 405, "Method Not Allowed");
                }
            } catch (Exception e) {
                System.err.println("Error handling request: " + e.getMessage());
                e.printStackTrace();
                sendResponse(exchange, 500, "Internal Server Error: " + e.getMessage());
            }
        }

        private void handleGet(HttpExchange exchange) throws IOException {
            Map<String, String> queryParams = parseQueryParams(exchange.getRequestURI().getQuery());
            String responseText;

            if (queryParams.containsKey("id")) {
                // Fetch specific session details
                int id = Integer.parseInt(queryParams.get("id"));
                responseText = Database.getSessionDetails(id);
                if ("{}".equals(responseText)) {
                    sendResponse(exchange, 404, "Session not found");
                    return;
                }
            } else {
                // Fetch all sessions summary list
                responseText = Database.getAllSessions();
            }

            sendResponse(exchange, 200, responseText);
        }

        private void handlePost(HttpExchange exchange) throws IOException {
            InputStream is = exchange.getRequestBody();
            String body = new String(is.readAllBytes(), StandardCharsets.UTF_8);

            if (body.trim().isEmpty()) {
                sendResponse(exchange, 400, "Bad Request: Empty Body");
                return;
            }

            // Parse request using lightweight JSON parser
            String name = JSONParser.getString(body, "name");
            String env = JSONParser.getString(body, "environment");
            String loadLevel = JSONParser.getString(body, "loadLevel");
            List<String> records = JSONParser.getRecordObjects(body);

            if (name.isEmpty() || env.isEmpty() || loadLevel.isEmpty() || records.isEmpty()) {
                sendResponse(exchange, 400, "Bad Request: Missing required parameters or empty records.");
                return;
            }

            // Save to SQLite
            boolean success = Database.saveSession(name, env, loadLevel, records);

            if (success) {
                sendResponse(exchange, 201, "{\"message\":\"Session saved successfully\"}");
            } else {
                sendResponse(exchange, 500, "{\"error\":\"Failed to save session to database\"}");
            }
        }

        private void handleDelete(HttpExchange exchange) throws IOException {
            Map<String, String> queryParams = parseQueryParams(exchange.getRequestURI().getQuery());
            
            if (!queryParams.containsKey("id")) {
                sendResponse(exchange, 400, "Bad Request: Missing 'id' parameter.");
                return;
            }

            int id = Integer.parseInt(queryParams.get("id"));
            boolean success = Database.deleteSession(id);

            if (success) {
                sendResponse(exchange, 200, "{\"message\":\"Session deleted successfully\"}");
            } else {
                sendResponse(exchange, 404, "{\"error\":\"Session not found or could not be deleted\"}");
            }
        }

        private void setCorsHeaders(HttpExchange exchange) {
            exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
            exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
            exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type, Authorization");
        }

        private void sendResponse(HttpExchange exchange, int statusCode, String responseText) throws IOException {
            byte[] bytes = responseText.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json; charset=utf-8");
            exchange.sendResponseHeaders(statusCode, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        }

        private Map<String, String> parseQueryParams(String query) {
            Map<String, String> params = new HashMap<>();
            if (query == null || query.isEmpty()) return params;

            String[] pairs = query.split("&");
            for (String pair : pairs) {
                String[] idx = pair.split("=");
                if (idx.length > 1) {
                    params.put(idx[0], idx[1]);
                } else if (idx.length == 1) {
                    params.put(idx[0], "");
                }
            }
            return params;
        }
    }
}
