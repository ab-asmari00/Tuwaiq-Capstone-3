package com.example.tuwaiqcapstone3.Controller;

import com.example.tuwaiqcapstone3.API.ApiResponse;
import com.example.tuwaiqcapstone3.Model.User;
import com.example.tuwaiqcapstone3.Service.AiService;
import com.example.tuwaiqcapstone3.Service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final AiService aiService;

    @GetMapping("/get")
    public ResponseEntity<?> getAllUsers() {
        return ResponseEntity.status(200).body(userService.getAllUsers());
    }

    @GetMapping("/get/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Integer id) {
        return ResponseEntity.status(200).body(userService.getUserById(id));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody @Valid User user) {
        userService.register(user);
        return ResponseEntity.status(200).body(new ApiResponse("User registered successfully"));
    }

    @PostMapping("/login/{email}/{password}")
    public ResponseEntity<?> login(@PathVariable String email, @PathVariable String password) {
        userService.login(email, password);
        return ResponseEntity.status(200).body(new ApiResponse("Login successful"));
    }

//    @PostMapping("/add")
//    public ResponseEntity<?> addUser(@RequestBody @Valid User user) {
//        userService.addUser(user);
//        return ResponseEntity.status(200)
//                .body(new ApiResponse("user added successfully"));
//    }

    @PutMapping("/update/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Integer id, @RequestBody @Valid User user) {
        userService.updateUser(id, user);

        return ResponseEntity.status(200).body(new ApiResponse("user updated successfully"));
    }

    @GetMapping("/{userId}/matches")
    public ResponseEntity<?> getUserMatches(@PathVariable Integer userId) {
        return ResponseEntity.status(200).body(userService.getUserMatches(userId));
    }

    @GetMapping("/{userId}/matches/without-rides")
    public ResponseEntity<?> getMatchesWithoutArrangedRides(@PathVariable Integer userId) {
        return ResponseEntity.status(200).body(userService.getMatchesWithoutArrangedRides(userId));
    }

    @PostMapping("/{userId}/matches/{matchId}")
    public ResponseEntity<?> addMatchToUser(@PathVariable Integer userId, @PathVariable Integer matchId) {
        userService.addMatchToUser(userId, matchId);
        return ResponseEntity.status(200).body(new ApiResponse("user match added successfully"));
    }

    @DeleteMapping("/{userId}/matches/{matchId}")
    public ResponseEntity<?> removeMatchFromUser(@PathVariable Integer userId, @PathVariable Integer matchId) {
        userService.removeMatchFromUser(userId, matchId);
        return ResponseEntity.status(200).body(new ApiResponse("user match deleted successfully"));
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Integer id) {
        userService.deleteUser(id);

        return ResponseEntity.status(200).body(new ApiResponse("user deleted successfully"));
    }

    @GetMapping("/search/{name}")
    public ResponseEntity<?> searchByName(@PathVariable String name) {
        return ResponseEntity.status(200).body(userService.searchByName(name));
    }

    @GetMapping("/above-average-rating")
    public ResponseEntity<?> getUsersAboveAverageRating() {
        return ResponseEntity.status(200).body(userService.getUsersAboveAverageRating());
    }

    @GetMapping("/below-average-rating")
    public ResponseEntity<?> getUsersBelowAverageRating() {
        return ResponseEntity.status(200).body(userService.getUsersBelowAverageRating());
    }

    @GetMapping("/average-rating/{userId}")
    public ResponseEntity<?> getUserAverageRating(@PathVariable Integer userId) {
        return ResponseEntity.status(200).body(userService.getUserAverageRating(userId));
    }

    @GetMapping("/ride-statistics/{userId}")
    public ResponseEntity<?> getUserRideStatistics(@PathVariable Integer userId) {
        return ResponseEntity.status(200).body(userService.getUserRideStatistics(userId));
    }

    @GetMapping("/match-statistics/{userId}")
    public ResponseEntity<?> getUserMatchStatistics(@PathVariable Integer userId) {
        return ResponseEntity.status(200).body(userService.getUserMatchStatistics(userId));
    }

    @GetMapping("/upcoming-rides/{userId}")
    public ResponseEntity<?> getUserUpcomingRides(@PathVariable Integer userId) {
        return ResponseEntity.status(200).body(userService.getUserUpcomingRides(userId));
    }

    @GetMapping("/review-summary/{userId}")
    public ResponseEntity<?> summarizeUserReviews(@PathVariable Integer userId) {
        return ResponseEntity.status(200).body(aiService.summarizeUserReviews(userId));
    }

    @GetMapping("/ai-matchday-plan/{userId}/{lang}")
    public ResponseEntity<?> generateMatchdayPlan(@PathVariable Integer userId, @PathVariable String lang) {
        return ResponseEntity.status(200).body(aiService.generateMatchdayPlan(userId, lang));
    }

    @PostMapping("/send-plan/{userId}")
    public ResponseEntity<?> sendPlanByEmail(
            @PathVariable Integer userId,
            @RequestParam(defaultValue = "en") String lang) {
        userService.sendPlanByEmail(userId, lang);
        return ResponseEntity.status(200).body(new ApiResponse("Match plan sent to your email successfully"));
    }


}