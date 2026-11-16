package com.example.zhanfinancebackend.modules.chat.repository;

import com.example.zhanfinancebackend.modules.chat.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    @Query("SELECT m FROM ChatMessage m WHERE " +
           "((m.sender.id = :userId1 AND m.receiver.id = :userId2) OR " +
           "(m.sender.id = :userId2 AND m.receiver.id = :userId1)) " +
           "AND m.id > :afterId " +
           "ORDER BY m.createdAt ASC")
    List<ChatMessage> findChatHistory(
            @Param("userId1") Long userId1, 
            @Param("userId2") Long userId2, 
            @Param("afterId") Long afterId
    );

    @Query("SELECT m FROM ChatMessage m WHERE " +
           "((m.sender.id = :userId1 AND m.receiver.id = :userId2) OR " +
           "(m.sender.id = :userId2 AND m.receiver.id = :userId1)) " +
           "ORDER BY m.createdAt ASC")
    List<ChatMessage> findChatHistoryFull(
            @Param("userId1") Long userId1, 
            @Param("userId2") Long userId2
    );
    
    int countByReceiverIdAndIsReadFalse(Long receiverId);
    
    int countBySenderIdAndReceiverIdAndIsReadFalse(Long senderId, Long receiverId);
    
    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE ChatMessage m SET m.isRead = true WHERE m.receiver.id = :receiverId AND m.sender.id = :senderId AND m.isRead = false")
    void markMessagesAsRead(@Param("receiverId") Long receiverId, @Param("senderId") Long senderId);
    
    @Query(value = "SELECT * FROM chat_messages WHERE " +
           "((sender_id = :userId1 AND receiver_id = :userId2) OR " +
           "(sender_id = :userId2 AND receiver_id = :userId1)) " +
           "ORDER BY created_at DESC LIMIT 1", nativeQuery = true)
    ChatMessage findLastMessage(
            @Param("userId1") Long userId1, 
            @Param("userId2") Long userId2
    );

    @Query("SELECT m.sender.id, COUNT(m) FROM ChatMessage m WHERE m.receiver.id = :receiverId AND m.isRead = false GROUP BY m.sender.id")
    List<Object[]> countUnreadByReceiverGroupedBySender(@Param("receiverId") Long receiverId);

    @Query(value = "WITH user_chats AS (" +
           "    SELECT m.*, " +
           "           CASE WHEN m.sender_id = :userId THEN m.receiver_id ELSE m.sender_id END AS other_user_id " +
           "    FROM chat_messages m " +
           "    WHERE m.sender_id = :userId OR m.receiver_id = :userId" +
           ") " +
           "SELECT DISTINCT ON (other_user_id) id, sender_id, receiver_id, content, created_at, is_read, is_deleted " +
           "FROM user_chats " +
           "ORDER BY other_user_id, created_at DESC", 
           nativeQuery = true)
    List<ChatMessage> findLastMessagesForUser(@Param("userId") Long userId);
}
