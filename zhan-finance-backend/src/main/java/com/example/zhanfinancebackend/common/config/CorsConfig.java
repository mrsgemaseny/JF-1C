package com.example.zhanfinancebackend.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${app.cors.allowed-origins:https://mrsgemaseny.github.io,https://zhanfinance.fly.dev,http://localhost:5173,capacitor://localhost,http://localhost,https://localhost}") String allowedOrigins,
            @Value("${app.cors.allowed-origin-patterns:http://localhost:*,http://127.0.0.1:*,https://zhanfinance.fly.dev,capacitor://*,ionic://*}") String allowedOriginPatterns

    ) {
        CorsConfiguration configuration = new CorsConfiguration();

        List<String> allPatterns = new java.util.ArrayList<>();
        allPatterns.addAll(cleanOrigins(allowedOrigins));
        allPatterns.addAll(cleanOrigins(allowedOriginPatterns));

        configuration.setAllowedOriginPatterns(allPatterns);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Authorization", "X-Refresh-Token"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    private List<String> cleanOrigins(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .map(origin -> {
                    if (origin.startsWith("http://") || origin.startsWith("https://")) {
                        int slashIdx = origin.indexOf('/', origin.indexOf("//") + 2);
                        if (slashIdx != -1) {
                            return origin.substring(0, slashIdx);
                        }
                    }
                    return origin;
                })
                .distinct()
                .toList();
    }
}
