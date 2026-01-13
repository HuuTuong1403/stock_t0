import mongoose, { Document, Model } from "mongoose";
import bcrypt from "bcrypt";

export type UserType = "admin" | "user";

export interface IUser extends Document {
  username: string;
  password: string;
  fullName: string;
  avatar?: string;
  type: UserType;
  createdAt: Date;
  updatedAt: Date;
  comparePassword?(candidate: string): Promise<boolean>;
  investorToken?: string;
  investorId?: string;
  dnseUsername?: string;
  dnsePassword?: string;
}

const UserSchema = new mongoose.Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, "Username là bắt buộc"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password là bắt buộc"],
      minlength: [6, "Password tối thiểu 6 ký tự"],
    },
    fullName: {
      type: String,
      required: [true, "Họ tên là bắt buộc"],
      trim: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    investorToken: {
      type: String,
      default: "",
    },
    investorId: {
      type: String,
      default: "",
    },
    dnseUsername: {
      type: String,
      default: "",
    },
    dnsePassword: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.pre("save", async function () {
  const user = this as IUser;
  if (!user.isModified("password")) {
    return;
  }

  const salt = await bcrypt.hash(user.password, 10);
  user.password = salt;
});

UserSchema.methods.comparePassword = async function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
