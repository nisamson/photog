import mongoose, {Schema, Document} from "mongoose";
import argon2, {argon2id} from 'argon2';


export const UserSchema = new Schema({
    name: String,
    passHash: String
});

export interface UserDoc extends Document {
    name: String,
    passHash: String
}

export interface LoginUser extends Document {
    name: String
}

UserSchema.index({name: 1}, {unique: true});
UserSchema.index({name: 'hashed'});

export async function createUser(user: string, pass: string): Promise<UserDoc> {
    return User.findOneAndUpdate({name: user}, {passHash: await argon2.hash(pass, {type: argon2id})}, {
        new: true,
        upsert: true
    });
}

export const User = mongoose.model<UserDoc>('User', UserSchema);
