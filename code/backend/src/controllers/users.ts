import "dotenv/config";
import { RequestHandler } from "express";
import UserModel from "../models/user";
import createHttpError from "http-errors";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import env from "../util/validateEnv";

export const getAuthenticatedUser: RequestHandler = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.session.userId).select([
      "+first",
      "+last",
      "+email",
      "+weight",
      "+admin",
      "+workouts",
    ]);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

interface SignUpBody {
  username?: string;
  password?: string;
  confirm_password?: string;
  first?: string;
  last?: string;
  email?: string;
  weight?: number;
  admin?: boolean;
}

export const signUp: RequestHandler<
  unknown,
  unknown,
  SignUpBody,
  unknown
> = async (req, res, next) => {
  const username = req.body.username;
  const passwordRaw = req.body.password;
  const confirmPass = req.body.confirm_password;
  const first = req.body.first;
  const last = req.body.last;
  const email = req.body.email;
  const weight = req.body.weight;

  try {
    if (!username || !passwordRaw || !first || !last || !email || !weight) {
      throw createHttpError(400, "Parameters missing");
    }

    if (passwordRaw !== confirmPass) {
      throw createHttpError(409, "Passwords must match");
    }

    const usernameAlreadyExists = await UserModel.findOne({
      username: username,
    }).exec();

    if (usernameAlreadyExists) {
      throw createHttpError(
        409,
        "Username already taken. Please choose a different one."
      );
    }

    const emailAlreadyExists = await UserModel.findOne({ email: email }).exec();
    if (emailAlreadyExists) {
      throw createHttpError(
        409,
        "A user with this email address already exists."
      );
    }

    const passwordHashed = await bcrypt.hash(passwordRaw, 10);

    const newUser = await UserModel.create({
      username: username,
      password: passwordHashed,
      first: first,
      last: last,
      email: email,
      weight: weight,
    });

    req.session.userId = newUser._id;
    res.status(201).json(newUser);
  } catch (error) {
    next(error);
  }
};

interface LoginBody {
  username?: string;
  password?: string;
}

export const login: RequestHandler<
  unknown,
  unknown,
  LoginBody,
  unknown
> = async (req, res, next) => {
  const username = req.body.username;
  const password = req.body.password;

  try {
    if (!username || !password) {
      throw createHttpError(400, "Parameters missing");
    }

    const user = await UserModel.findOne({ username: username })
      .select(["+password"])
      .exec();

    if (!user) {
      throw createHttpError(401, "Username and/or password are incorrect.");
    }

    const passwordsMatch = await bcrypt.compare(password, user.password);

    if (!passwordsMatch) {
      throw createHttpError(401, "Username and/or password are incorrect.");
    }

    req.session.userId = user._id;
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

interface RecoveryBody {
  email?: string;
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: env.RECOVERY_EMAIL,
    pass: env.RECOVERY_EMAIL_PASS,
  },
});

export const sendRecoveryEmail: RequestHandler<
  unknown,
  unknown,
  RecoveryBody,
  unknown
> = async (req, res, next) => {
  const email = req.body.email;
  try {
    if (!email) {
      throw createHttpError(400, "Parameters missing");
    }

    const user = await UserModel.findOne({ email: email })
      .select(["+username", "+email"])
      .exec();

    if (!user) {
      throw createHttpError(401, "Invalid email");
    }

    const mailOptions = {
      from: "FitnessTracker 5000",
      to: user.email,
      subject: "FitnessTracker 5000 - Account Recovery",
      text: "Username: " + user.username,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
        throw createHttpError(502, "Failed to send recovery email.");
      } else {
        console.log("Email sent: " + info.response);
      }
    });
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

interface AdminSearchBody {
  username?: string;
  email?: string;
}

export const adminSearch: RequestHandler<
  unknown,
  unknown,
  AdminSearchBody,
  unknown
> = async (req, res, next) => {
  const username = req.body.username;
  const email = req.body.email;
  try {
    if (!username && !email) {
      throw createHttpError(400, "Parameters missing");
    }
    // Function will always prioritize search by username, even if both parameters are given.
    const userByUsername = await UserModel.findOne({ username: username })
      .select(["+username", "+email", "+first", "+last", "+weight", "+admin"])
      .exec();

    if (!userByUsername) {
      const userByEmail = await UserModel.findOne({ email: email })
        .select(["+username", "+email", "+first", "+last", "+weight", "+admin"])
        .exec();
      if (userByEmail) {
        if (userByEmail.admin === true) {
          throw createHttpError(401, "Can not retrieve admin account.");
        }
        res.status(201).json(userByEmail);
      } else {
        throw createHttpError(401, "User account not found.");
      }
    } else {
      if (userByUsername.admin === true) {
        throw createHttpError(401, "Can not retrieve admin account.");
      }
      res.status(201).json(userByUsername);
    }
  } catch (error) {
    next(error);
  }
};

interface UserToDelete {
  username?: string;
}

export const deleteUser: RequestHandler<
  unknown,
  unknown,
  UserToDelete,
  unknown
> = async (req, res, next) => {
  const username = req.body.username;
  try {
    const response = UserModel.deleteOne({ username: username }).exec();
    if (!response) {
      throw createHttpError(409, "Failed to delete user account.");
    }
    console.log("User account deleted: " + username);
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

interface UpdatedUserInfo {
  username?: string;
  email?: string;
  first?: string;
  last?: string;
  weight?: number;
  admin?: boolean;
  oldUsername?: string;
  oldEmail?: string;
}

export const editUser: RequestHandler<
  unknown,
  unknown,
  UpdatedUserInfo,
  unknown
> = async (req, res, next) => {
  const username = req.body.username;
  const first = req.body.first;
  const last = req.body.last;
  const email = req.body.email;
  const weight = req.body.weight;
  let admin = req.body.admin;
  const oldUsername = req.body.oldUsername;
  const oldEmail = req.body.oldEmail;

  try {
    if (
      !username ||
      !first ||
      !last ||
      !email ||
      !weight ||
      !oldUsername ||
      !oldEmail
    ) {
      throw createHttpError(400, "Parameters missing");
    }

    if (!admin) {
      admin = false;
    }

    /* Old email and old username variables used to reduce number of average queries by ensuring that a query only executes
       if a change has occurred. Old username also required for update query if username has been changed.*/
    if (username !== oldUsername) {
      const existingUsername = await UserModel.findOne({
        username: username,
      }).exec();

      if (existingUsername) {
        throw createHttpError(
          409,
          "Username already taken. Please choose a different one."
        );
      }
    }

    if (email !== oldEmail) {
      const existingEmail = await UserModel.findOne({ email: email }).exec();

      if (existingEmail) {
        throw createHttpError(
          409,
          "A user with this email address already exists."
        );
      }
    }

    const updatedUser = await UserModel.findOneAndUpdate(
      { username: oldUsername },
      {
        username: username,
        first: first,
        last: last,
        email: email,
        weight: weight,
        admin: admin,
      }
    );
    res.status(201).json(updatedUser);
  } catch (error) {
    next(error);
  }
};

export const logout: RequestHandler = (req, res, next) => {
  req.session.destroy((error) => {
    if (error) {
      next(error);
    } else {
      res.sendStatus(200);
    }
  });
};
