import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class JSONParser {

    /**
     * Extracts a string field value from a JSON object
     */
    public static String getString(String json, String key) {
        Pattern pattern = Pattern.compile("\"" + key + "\":\\s*\"([^\"]*)\"");
        Matcher matcher = pattern.matcher(json);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return "";
    }

    /**
     * Extracts an integer field value from a JSON object
     */
    public static int getInt(String json, String key) {
        Pattern pattern = Pattern.compile("\"" + key + "\":\\s*([0-9-]+)");
        Matcher matcher = pattern.matcher(json);
        if (matcher.find()) {
            return Integer.parseInt(matcher.group(1));
        }
        return 0;
    }

    /**
     * Extracts a double field value from a JSON object
     */
    public static double getDouble(String json, String key) {
        Pattern pattern = Pattern.compile("\"" + key + "\":\\s*([0-9.-]+)");
        Matcher matcher = pattern.matcher(json);
        if (matcher.find()) {
            return Double.parseDouble(matcher.group(1));
        }
        return 0.0;
    }

    /**
     * Extracts the records array content as a list of JSON-like strings representing each record object.
     */
    public static List<String> getRecordObjects(String json) {
        List<String> records = new ArrayList<>();
        int arrayStart = json.indexOf("\"records\":");
        if (arrayStart == -1) return records;
        
        int startBrace = json.indexOf("[", arrayStart);
        if (startBrace == -1) return records;
        
        // Find matching closing bracket for array
        int bracketCount = 1;
        int index = startBrace + 1;
        while (index < json.length() && bracketCount > 0) {
            char c = json.charAt(index);
            if (c == '[') bracketCount++;
            else if (c == ']') bracketCount--;
            index++;
        }
        
        String arrayContent = json.substring(startBrace + 1, index - 1).trim();
        if (arrayContent.isEmpty()) return records;

        // Split by the boundary between objects, i.e., "}," or "}, " and handle brackets
        // A simple scanner that splits by matching { }
        int len = arrayContent.length();
        int braceCount = 0;
        int lastStart = -1;
        
        for (int i = 0; i < len; i++) {
            char c = arrayContent.charAt(i);
            if (c == '{') {
                if (braceCount == 0) {
                    lastStart = i;
                }
                braceCount++;
            } else if (c == '}') {
                braceCount--;
                if (braceCount == 0 && lastStart != -1) {
                    records.add(arrayContent.substring(lastStart, i + 1));
                    lastStart = -1;
                }
            }
        }
        
        return records;
    }
}
