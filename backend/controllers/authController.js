import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// Generate JWT token
const generateToken = (id)=>{
    return jwt.sign({id}, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || "7d",
    });
};

// @desc   Register new user
// @route POST /api/auth/register
// @access Public

export const register = async(req, res, next) =>{
    try{

    }
    catch(error)
    {
        next(error);
    }
};

// @desc   Login User
// @route  POST /api/auth/login
// @access Public

export const login = async(req, res, next)=>{

};

// @desc.      Get User Profile
// @route.     Get /api/auth/profile
// @access     Private
export const updateProfile = async(req, res, next)=>{


};

// @desc        Change Password
// @route       POST/api/auth/change-password
// @access      Private
export const changePassword = async(req, res, next)=>{


};
