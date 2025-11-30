export interface GetUserIdPasswordType {
    userID: string;
    hashedPassword: string;
}

export interface LoginCleanedBodyType {
    email: string;
    password: string;
}

export interface SignupCleanedBodyType extends LoginCleanedBodyType {
    name: string;
}

export interface UserRegistrationInputDataType {
    name: string;
    email: string;
    hashedPassword: string;
}

export interface UserRegistrationOutputDataType {
    userID: string;
}
