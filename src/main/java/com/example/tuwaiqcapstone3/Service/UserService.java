package com.example.tuwaiqcapstone3.Service;

import com.example.tuwaiqcapstone3.API.ApiException;
import com.example.tuwaiqcapstone3.DTO.UserMatchStatsDTO;
import com.example.tuwaiqcapstone3.DTO.UserRideStatsDTO;
import com.example.tuwaiqcapstone3.Model.Match;
import com.example.tuwaiqcapstone3.Model.Ride;
import com.example.tuwaiqcapstone3.Model.User;
import com.example.tuwaiqcapstone3.Repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final MatchRepository matchRepository;
    private final ReviewRepository reviewRepository;
    private final RideRepository rideRepository;
    private final RidePerticipantRepository ridePerticipantRepository;
    private final EmailService emailService;
    private final PdfService pdfService;



    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User getUserById(Integer id) {

        User user = userRepository.findUserById(id);

        if (user == null) {
            throw new ApiException("user not found");
        }

        return user;
    }

    public void register(User user) {
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new ApiException("Email is already registered");
        }
        if (userRepository.existsByPhoneNumber(user.getPhoneNumber())) {
            throw new ApiException("Phone number is already registered");
        }
        user.setCreatedAt(LocalDateTime.now());
        user.setBanned(false);
        userRepository.save(user);
        emailService.sendHtmlEmail(user.getEmail(), "Welcome to Darbak | مرحبًا بك في دربك",
                EmailTemplates.welcome(user.getName()));

    }

    public void login(String email, String password) {
        User user = userRepository.findUserByEmail(email);
        if (user == null || !user.getPassword().equals(password)) {
            throw new ApiException("Invalid email or password");
        }

        if (user.getBanned()) {
            throw new ApiException("User is banned");
        }
    }

//    public void addUser(User user) {
//
//        User checkEmail = userRepository.findUserByEmail(user.getEmail());
//
//        if (checkEmail != null) {
//            throw new ApiException("email already exists");
//        }
//
//        User checkPhone = userRepository.findUserByPhoneNumber(user.getPhoneNumber());
//
//        if (checkPhone != null) {
//            throw new ApiException("phone number already exists");
//        }
//
//        user.setCreatedAt(LocalDateTime.now());
//
//        userRepository.save(user);
//    }

    public void updateUser(Integer id, User user) {

        User oldUser = userRepository.findUserById(id);

        if (oldUser == null) {
            throw new ApiException("user not found");
        }

        User checkEmail = userRepository.findUserByEmail(user.getEmail());

        if (checkEmail != null && !checkEmail.getId().equals(id)) {
            throw new ApiException("email already exists");
        }

        User checkPhone = userRepository.findUserByPhoneNumber(user.getPhoneNumber());

        if (checkPhone != null && !checkPhone.getId().equals(id)) {
            throw new ApiException("phone number already exists");
        }

        oldUser.setName(user.getName());
        oldUser.setEmail(user.getEmail());
        oldUser.setPassword(user.getPassword());
        oldUser.setPhoneNumber(user.getPhoneNumber());

        userRepository.save(oldUser);
    }

    public void deleteUser(Integer id) {

        User user = userRepository.findUserById(id);

        if (user == null) {
            throw new ApiException("user not found");
        }

        userRepository.delete(user);
    }

    public List<Match> getUserMatches(Integer userId) {
        User user = getUserById(userId);
        return new ArrayList<>(user.getMatches());
    }

    // Returns upcoming saved matches without an active driver or accepted passenger ride.
    public List<Match> getMatchesWithoutArrangedRides(Integer userId) {
        getUserById(userId);

        LocalDateTime now = LocalDateTime.now();
        List<Match> savedMatches = matchRepository.findDistinctMatchesByUsers_Id(userId);
        Set<Integer> arrangedMatchIds = new HashSet<>(rideRepository.findArrangedMatchIdsByUserId(userId));
        List<Match> matchesWithoutRides = new ArrayList<>();

        for (Match match : savedMatches) {
            if ("scheduled".equals(match.getStatus())
                    && match.getStartTime().isAfter(now)
                    && !arrangedMatchIds.contains(match.getId())) {
                matchesWithoutRides.add(match);
            }
        }

        matchesWithoutRides.sort(Comparator.comparing(Match::getStartTime));
        return matchesWithoutRides;
    }

    public void addMatchToUser(Integer userId, Integer matchId) {
        User user = getUserById(userId);
        Match match = matchRepository.findMatchById(matchId);

        if (match == null) {
            throw new ApiException("match not found");
        }

        if (user.getMatches().stream().anyMatch(savedMatch -> savedMatch.getId().equals(matchId))) {
            throw new ApiException("user match already exists");
        }

        user.getMatches().add(match);
        userRepository.save(user);
    }

    public void removeMatchFromUser(Integer userId, Integer matchId) {
        User user = getUserById(userId);
        Match match = matchRepository.findMatchById(matchId);

        if (match == null) {
            throw new ApiException("match not found");
        }

        if (!user.getMatches().removeIf(savedMatch -> savedMatch.getId().equals(matchId))) {
            throw new ApiException("user match not found");
        }

        userRepository.save(user);
    }

    public List<User> searchByName(String name) {
        List<User> users = userRepository.findUsersByNameContainingIgnoreCase(name);
        if (users.isEmpty()) {
            throw new ApiException("No users found with this name");
        }
        return users;
    }

    public List<User> getUsersAboveAverageRating() {
        return userRepository.findUsersAboveAverageRating();
    }

    public List<User> getUsersBelowAverageRating() {
        return userRepository.findUsersBelowAverageRating();
    }

    public Double getUserAverageRating(Integer userId) {
        getUserById(userId);
        Double avg = reviewRepository.findAverageRatingByUserId(userId);
        if (avg == null) {
            return 0.0;
        }
        return avg;
    }

    // 8. User's ride statistics
    public UserRideStatsDTO getUserRideStatistics(Integer userId) {
        getUserById(userId);
        return new UserRideStatsDTO(
                rideRepository.countByDriverId(userId),
                rideRepository.countByDriverIdAndStatus(userId, "completed"),
                rideRepository.countByDriverIdAndStatus(userId, "cancelled"),
                ridePerticipantRepository.countRidesAsPassenger(userId),
                ridePerticipantRepository.countRidesAsPassengerByStatus(userId, "completed")
        );
    }

    // 9. User's match statistics (matches he is connected to through his rides)
    public UserMatchStatsDTO getUserMatchStatistics(Integer userId) {
        getUserById(userId);
        Integer total = rideRepository.countMatchesByUserId(userId);
        Integer upcoming = rideRepository.countUpcomingMatchesByUserId(userId, LocalDateTime.now());
        return new UserMatchStatsDTO(total, upcoming, total - upcoming);
    }

    // 10. User's upcoming rides
    public List<Ride> getUserUpcomingRides(Integer userId) {
        getUserById(userId);
        return rideRepository.findUpcomingRidesByUserId(userId, LocalDate.now());
    }

    // Send the user's upcoming ride plan by email as a PDF.
    public void sendPlanByEmail(Integer userId) {
        sendPlanByEmail(userId, "en");
    }

    public void sendPlanByEmail(Integer userId, String lang) {
        User user = getUserById(userId);
        List<Ride> rides = rideRepository.findUpcomingRidesByUserId(userId, LocalDate.now());
        if (rides.isEmpty()) {
            throw new ApiException("You have no upcoming plans to send");
        }

        String language = "ar".equalsIgnoreCase(lang) ? "ar" : "en";
        boolean ar = "ar".equals(language);
        byte[] pdf = pdfService.createPlanPdf(user, rides, language);

        String subject = ar ? "خطة مبارياتك" : "Your match plan";
        String text = ar
                ? "مرحبًا " + user.getName() + "، خطة مبارياتك مرفقة بصيغة PDF."
                : "Hi " + user.getName() + ", your match plan is attached as a PDF.";

        emailService.sendEmailWithPdf(user.getEmail(), subject, text, pdf, "match-plan.pdf");
    }

}