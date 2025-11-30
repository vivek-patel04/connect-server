import { Metadata } from "@grpc/grpc-js";
import { grpcCallTTL } from "../config/envConfig.js";
import { authUserGrpcKey } from "../config/envConfig.js";
import { authUserGrpcClient } from "../config/grpcClient.js";
import type { UserRegistrationInputDataType, GetUserIdPasswordType, UserRegistrationOutputDataType } from "../types/types.model.js";

const md = new Metadata();
md.set("x-api-key", authUserGrpcKey as string);

export const userRegistration = (data: UserRegistrationInputDataType): Promise<UserRegistrationOutputDataType> => {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            return reject("Exceeded time");
        }, grpcCallTTL);

        authUserGrpcClient.userRegistration(data, md, (error, response) => {
            clearTimeout(timeout);

            if (error) {
                return reject(error);
            }

            return resolve({ userID: response.userID });
        });
    });
};

export const getUserIdPass = (email: string): Promise<GetUserIdPasswordType> => {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject("Exceeded time");
        }, grpcCallTTL);

        authUserGrpcClient.getUserIdPass({ email }, md, (error, response) => {
            clearTimeout(timeout);

            if (error) {
                return reject(error);
            }

            return resolve({ userID: response.userID, hashedPassword: response.hashedPassword });
        });
    });
};
