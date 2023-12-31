import express from "express";
import * as UserController from "../controllers/users";
import * as WorkoutController from "../controllers/workouts";
import { requiresAuth } from "../middleware/auth";

const router = express.Router();

router.get("/", requiresAuth, UserController.getAuthenticatedUser);

router.post("/signup", UserController.signUp);

router.post("/login", UserController.login);

router.post("/logout", UserController.logout);

router.post("/account-recovery", UserController.sendRecoveryEmail);

router.post("/admin-search", UserController.adminSearch);

router.post("/delete-user", UserController.deleteUser);

router.post("/edit-user", UserController.editUser);

router.post("/add-workout", WorkoutController.createWorkout);

router.post("/get-calories-for-each-day", WorkoutController.getCaloriesForEachDay);

router.post("/get-user-workouts", WorkoutController.getUserWorkouts);

router.post("/edit-workout", WorkoutController.editWorkout);

export default router;
