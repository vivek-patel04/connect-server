import { postUserGrpcClient } from "../config/grpcClient.js";
import { Metadata } from "@grpc/grpc-js";
import { grpcSecret } from "../config/envConfig.js";
import type { UserType } from "../types/model.types.js";

const md = new Metadata();
md.set("x-grpc-secret", grpcSecret as string);

interface getUsersByUserIDsRequest {
    userIDs: string[];
}

interface getUsersByUserIDsResponse {
    users: UserType[];
}

export const getUsersByUserIDs = (requestObject: getUsersByUserIDsRequest): Promise<getUsersByUserIDsResponse> =>
    new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            return reject("Exceeded Time");
        }, 5000);

        postUserGrpcClient.getUsersByUserIDs(requestObject, md, (error, response) => {
            clearTimeout(timeout);

            if (error) {
                return reject(error);
            }

            return resolve({ users: response.users });
        });
    });

interface getUserByUserIDRequest {
    userID: string;
}

interface getUserByUserIDResponse {
    user: UserType | undefined;
}

export const getUserByUserID = (requestObject: getUserByUserIDRequest): Promise<getUserByUserIDResponse> =>
    new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            return reject("Exceeded Time");
        }, 5000);

        postUserGrpcClient.getUserByUserId(requestObject, md, (error, response) => {
            clearTimeout(timeout);

            if (error) {
                return reject(error);
            }

            return resolve({ user: response.user });
        });
    });

interface getConnectionUserIDsRequest {
    userID: string;
}

interface getConnectionUserIDsResponse {
    userIDs: string[];
}

export const getConnectionUserIDs = (requestObject: getConnectionUserIDsRequest): Promise<getConnectionUserIDsResponse> =>
    new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            return reject("Exceeded Time");
        }, 5000);

        postUserGrpcClient.getConnectionUserIDs(requestObject, md, (error, response) => {
            clearTimeout(timeout);

            if (error) {
                return reject(error);
            }

            return resolve({ userIDs: response.userIDs });
        });
    });
