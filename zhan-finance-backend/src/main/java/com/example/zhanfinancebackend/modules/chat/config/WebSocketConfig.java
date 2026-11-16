package com.example.zhanfinancebackend.modules.chat.config;

import com.example.zhanfinancebackend.modules.auth.security.CustomUserDetailsService;
import com.example.zhanfinancebackend.modules.auth.security.JwtService;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import com.example.zhanfinancebackend.modules.auth.security.UserPrincipal;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;
    
    @org.springframework.beans.factory.annotation.Value("${app.cors.allowed-origins:*}")
    private String[] allowedOrigins;

    public WebSocketConfig(JwtService jwtService, CustomUserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws", "/api/ws").setAllowedOriginPatterns(allowedOrigins).withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor != null) {
                    if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                        java.security.Principal principal = accessor.getUser();
                        if (principal == null) {
                            String authHeader = accessor.getFirstNativeHeader("Authorization");
                            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                                try {
                                    String token = authHeader.substring(7);
                                    String username = jwtService.extractUsernameIfValidAccessToken(token);
                                    if (username != null) {
                                        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                                        if (jwtService.isTokenValid(token, userDetails.getUsername())) {
                                            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                                            accessor.setUser(auth);
                                            principal = auth;
                                        }
                                    }
                                } catch (Exception ignored) {
                                }
                            }
                        }
                        if (principal == null) {
                            throw new IllegalArgumentException("Unauthorized: WebSocket connection requires authentication via cookies or token");
                        }

                    } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand()) || StompCommand.SEND.equals(accessor.getCommand())) {
                        java.security.Principal principal = accessor.getUser();
                        if (principal == null) {
                            throw new IllegalArgumentException("Unauthorized: WebSocket connection requires authentication");
                        }
                        String destination = accessor.getDestination();
                        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand()) && destination != null && destination.startsWith("/topic/chat/")) {
                            String[] parts = destination.split("/");
                            if (parts.length >= 4) {
                                String targetUserIdStr = parts[3];
                                if (principal instanceof UsernamePasswordAuthenticationToken auth) {
                                    Object p = auth.getPrincipal();
                                    if (p instanceof UserPrincipal) {
                                        UserPrincipal userPrincipal = 
                                            (UserPrincipal) p;
                                        boolean isAdminOrEmployee = userPrincipal.getAuthorities().stream()
                                                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_EMPLOYEE"));
                                        if (!isAdminOrEmployee && !String.valueOf(userPrincipal.getId()).equals(targetUserIdStr)) {
                                            throw new IllegalArgumentException("Forbidden");
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                return message;
            }
        });
    }
}
