import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class Database {
    private static final String DB_URL = "jdbc:sqlite:network_analyzer.db";

    static {
        // Load the SQLite JDBC driver class
        try {
            Class.forName("org.sqlite.JDBC");
        } catch (ClassNotFoundException e) {
            System.err.println("Failed to load SQLite JDBC driver: " + e.getMessage());
        }
    }

    /**
     * Initializes the SQLite database file and creates the required tables if they don't exist.
     */
    public static void initDatabase() {
        String createSessionsTable = "CREATE TABLE IF NOT EXISTS sessions (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                "name TEXT NOT NULL," +
                "environment TEXT NOT NULL," +
                "load_level TEXT NOT NULL," +
                "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
                ");";

        String createRecordsTable = "CREATE TABLE IF NOT EXISTS telemetry_records (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                "session_id INTEGER NOT NULL," +
                "time INTEGER NOT NULL," +
                "serving_cell TEXT NOT NULL," +
                "rsrp REAL NOT NULL," +
                "sinr REAL NOT NULL," +
                "rsrq REAL NOT NULL," +
                "dl_throughput REAL NOT NULL," +
                "ul_throughput REAL NOT NULL," +
                "latency REAL NOT NULL," +
                "jitter REAL NOT NULL," +
                "rb_usage INTEGER NOT NULL," +
                "FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE" +
                ");";

        try (Connection conn = DriverManager.getConnection(DB_URL);
             Statement stmt = conn.createStatement()) {
            
            stmt.execute(createSessionsTable);
            stmt.execute(createRecordsTable);
            System.out.println("SQLite Database initialized. Tables verified.");
            
        } catch (SQLException e) {
            System.err.println("Database initialization failed: " + e.getMessage());
        }
    }

    /**
     * Saves a network session and all associated telemetry records.
     * Uses a single transaction for efficiency.
     */
    public static boolean saveSession(String name, String env, String loadLevel, List<String> recordsJson) {
        Connection conn = null;
        try {
            conn = DriverManager.getConnection(DB_URL);
            conn.setAutoCommit(false); // Start Transaction

            // 1. Insert Session Header
            String insertSession = "INSERT INTO sessions (name, environment, load_level) VALUES (?, ?, ?);";
            int sessionId = -1;
            try (PreparedStatement pstmt = conn.prepareStatement(insertSession, Statement.RETURN_GENERATED_KEYS)) {
                pstmt.setString(1, name);
                pstmt.setString(2, env);
                pstmt.setString(3, loadLevel);
                pstmt.executeUpdate();

                try (ResultSet rs = pstmt.getGeneratedKeys()) {
                    if (rs.next()) {
                        sessionId = rs.getInt(1);
                    }
                }
            }

            if (sessionId == -1) {
                throw new SQLException("Failed to obtain generated session ID.");
            }

            // 2. Insert Telemetry Records
            String insertRecord = "INSERT INTO telemetry_records " +
                    "(session_id, time, serving_cell, rsrp, sinr, rsrq, dl_throughput, ul_throughput, latency, jitter, rb_usage) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);";

            try (PreparedStatement pstmt = conn.prepareStatement(insertRecord)) {
                for (String recordJson : recordsJson) {
                    pstmt.setInt(1, sessionId);
                    pstmt.setInt(2, JSONParser.getInt(recordJson, "time"));
                    pstmt.setString(3, JSONParser.getString(recordJson, "servingCellName"));
                    pstmt.setDouble(4, JSONParser.getDouble(recordJson, "rsrp"));
                    pstmt.setDouble(5, JSONParser.getDouble(recordJson, "sinr"));
                    pstmt.setDouble(6, JSONParser.getDouble(recordJson, "rsrq"));
                    pstmt.setDouble(7, JSONParser.getDouble(recordJson, "downlinkThroughput"));
                    pstmt.setDouble(8, JSONParser.getDouble(recordJson, "uplinkThroughput"));
                    pstmt.setDouble(9, JSONParser.getDouble(recordJson, "latency"));
                    pstmt.setDouble(10, JSONParser.getDouble(recordJson, "jitter"));
                    pstmt.setInt(11, JSONParser.getInt(recordJson, "resourceBlocksUsed"));
                    pstmt.addBatch();
                }
                pstmt.executeBatch();
            }

            conn.commit(); // Commit Transaction
            System.out.println("Successfully saved session '" + name + "' (ID: " + sessionId + ") with " + recordsJson.size() + " records.");
            return true;

        } catch (SQLException e) {
            System.err.println("Failed to save session: " + e.getMessage());
            if (conn != null) {
                try {
                    conn.rollback();
                    System.out.println("Transaction rolled back.");
                } catch (SQLException ex) {
                    System.err.println("Rollback failed: " + ex.getMessage());
                }
            }
            return false;
        } finally {
            if (conn != null) {
                try {
                    conn.close();
                } catch (SQLException e) {
                    System.err.println("Failed to close connection: " + e.getMessage());
                }
            }
        }
    }

    /**
     * Retrieves all saved sessions from the database formatted as a JSON array string.
     */
    public static String getAllSessions() {
        StringBuilder json = new StringBuilder("[");
        String sql = "SELECT * FROM sessions ORDER BY id DESC;";

        try (Connection conn = DriverManager.getConnection(DB_URL);
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {

            boolean first = true;
            while (rs.next()) {
                if (!first) {
                    json.append(",");
                }
                first = false;

                json.append("{")
                    .append("\"id\":").append(rs.getInt("id")).append(",")
                    .append("\"name\":\"").append(rs.getString("name")).append("\",")
                    .append("\"environment\":\"").append(rs.getString("environment")).append("\",")
                    .append("\"loadLevel\":\"").append(rs.getString("load_level")).append("\",")
                    .append("\"createdAt\":\"").append(rs.getString("created_at")).append("\"")
                    .append("}");
            }

        } catch (SQLException e) {
            System.err.println("Failed to fetch sessions: " + e.getMessage());
        }

        json.append("]");
        return json.toString();
    }

    /**
     * Retrieves a full session's details and records as a combined JSON object.
     */
    public static String getSessionDetails(int sessionId) {
        String sessionSql = "SELECT * FROM sessions WHERE id = ?;";
        String recordsSql = "SELECT * FROM telemetry_records WHERE session_id = ? ORDER BY time ASC;";

        try (Connection conn = DriverManager.getConnection(DB_URL);
             PreparedStatement sessionPstmt = conn.prepareStatement(sessionSql);
             PreparedStatement recordsPstmt = conn.prepareStatement(recordsSql)) {

            // 1. Fetch Session Header
            sessionPstmt.setInt(1, sessionId);
            String sessionName = "";
            String environment = "";
            String loadLevel = "";
            String createdAt = "";
            
            try (ResultSet rs = sessionPstmt.executeQuery()) {
                if (rs.next()) {
                    sessionName = rs.getString("name");
                    environment = rs.getString("environment");
                    loadLevel = rs.getString("load_level");
                    createdAt = rs.getString("created_at");
                } else {
                    return "{}"; // Session not found
                }
            }

            // 2. Fetch Telemetry Records
            recordsPstmt.setInt(1, sessionId);
            StringBuilder recordsJson = new StringBuilder("[");
            
            try (ResultSet rs = recordsPstmt.executeQuery()) {
                boolean first = true;
                while (rs.next()) {
                    if (!first) {
                        recordsJson.append(",");
                    }
                    first = false;

                    recordsJson.append("{")
                        .append("\"time\":").append(rs.getInt("time")).append(",")
                        .append("\"servingCellName\":\"").append(rs.getString("serving_cell")).append("\",")
                        .append("\"rsrp\":").append(rs.getDouble("rsrp")).append(",")
                        .append("\"sinr\":").append(rs.getDouble("sinr")).append(",")
                        .append("\"rsrq\":").append(rs.getDouble("rsrq")).append(",")
                        .append("\"downlinkThroughput\":").append(rs.getDouble("dl_throughput")).append(",")
                        .append("\"uplinkThroughput\":").append(rs.getDouble("ul_throughput")).append(",")
                        .append("\"latency\":").append(rs.getDouble("latency")).append(",")
                        .append("\"jitter\":").append(rs.getDouble("jitter")).append(",")
                        .append("\"resourceBlocksUsed\":").append(rs.getInt("rb_usage"))
                        .append("}");
                }
            }
            recordsJson.append("]");

            // 3. Combine into final JSON
            return "{" +
                    "\"id\":" + sessionId + "," +
                    "\"name\":\"" + sessionName + "\"," +
                    "\"environment\":\"" + environment + "\"," +
                    "\"loadLevel\":\"" + loadLevel + "\"," +
                    "\"createdAt\":\"" + createdAt + "\"," +
                    "\"records\":" + recordsJson.toString() +
                    "}";

        } catch (SQLException e) {
            System.err.println("Failed to fetch session details: " + e.getMessage());
            return "{}";
        }
    }

    /**
     * Deletes a session and cascadingly removes its records.
     */
    public static boolean deleteSession(int sessionId) {
        String deleteRecords = "DELETE FROM telemetry_records WHERE session_id = ?;";
        String deleteSession = "DELETE FROM sessions WHERE id = ?;";

        try (Connection conn = DriverManager.getConnection(DB_URL);
             PreparedStatement recordsPstmt = conn.prepareStatement(deleteRecords);
             PreparedStatement sessionPstmt = conn.prepareStatement(deleteSession)) {

            // Delete records first
            recordsPstmt.setInt(1, sessionId);
            recordsPstmt.executeUpdate();

            // Delete session header
            sessionPstmt.setInt(1, sessionId);
            int rowsDeleted = sessionPstmt.executeUpdate();

            return rowsDeleted > 0;

        } catch (SQLException e) {
            System.err.println("Failed to delete session: " + e.getMessage());
            return false;
        }
    }
}
