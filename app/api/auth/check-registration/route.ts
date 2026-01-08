import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { User } from "@/lib/models";

export async function GET() {
  try {
    await dbConnect();
    const userCount = await User.countDocuments();
    
    // If no users exist, anyone can register
    // Otherwise, only admins can register (checked in register route)
    return NextResponse.json({ allowed: userCount === 0 });
  } catch (error) {
    console.error("Error checking registration:", error);
    return NextResponse.json({ allowed: false }, { status: 500 });
  }
}

