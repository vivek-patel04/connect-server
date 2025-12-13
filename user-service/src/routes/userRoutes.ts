import express from "express";
import * as main from "../controllers/index.js";
import { userAuthentication } from "../middlewares/userAuthentication.js";
import {
    awardInputValidation,
    updatePasswordInputValidator,
    connectionQueryParamValidation,
    educationInputValidation,
    idParamValidation,
    skillsInputValidation,
    startQueryParamValidation,
    userBasicInfoInputValidation,
    workExpInputValidation,
    createPasswordInputValidator,
} from "../middlewares/inputValidator.js";
import { csrfTokenValidation } from "../middlewares/validateCsrfToken.js";
import { multerMiddlewareForProfilePicture } from "../middlewares/multer.js";

export const userRoutes = express.Router();

userRoutes.delete("/del/award/:id", userAuthentication, csrfTokenValidation, idParamValidation, main.deleteAward);
userRoutes.delete("/del/connection/:id", userAuthentication, csrfTokenValidation, idParamValidation, main.deleteConnection);
userRoutes.delete("/del/education/:id", userAuthentication, csrfTokenValidation, idParamValidation, main.deleteEducation);
userRoutes.delete("/del/profile-picture", userAuthentication, csrfTokenValidation, main.deleteProfilePicture);
userRoutes.delete("/del/sent-request/:id", userAuthentication, csrfTokenValidation, idParamValidation, main.deleteSentRequest);
userRoutes.delete("/del/skill/:id", userAuthentication, csrfTokenValidation, idParamValidation, main.deleteSkill);
userRoutes.delete("/del/work/:id", userAuthentication, csrfTokenValidation, idParamValidation, main.deleteWorkExperience);

userRoutes.get("/relation/:id", userAuthentication, idParamValidation, main.connectionRelation);
userRoutes.get("/connection/count/:id", idParamValidation, main.connectionCount);
userRoutes.get("/connection/received", userAuthentication, startQueryParamValidation, main.receivedConnectionRequest);
userRoutes.get("/connection/sent", userAuthentication, startQueryParamValidation, main.sentConnectionRequest);
userRoutes.get("/profile/:id", idParamValidation, main.userProfile);
userRoutes.get("/connection/suggestion", userAuthentication, main.userSuggestion);
userRoutes.get("/connection/:id", idParamValidation, connectionQueryParamValidation, main.connection);
userRoutes.get("/me", userAuthentication, main.me);

userRoutes.patch("/upadte/award/:id", userAuthentication, csrfTokenValidation, idParamValidation, awardInputValidation, main.updateAward);
userRoutes.patch("/update/education/:id", userAuthentication, csrfTokenValidation, idParamValidation, educationInputValidation, main.updateEducation);
userRoutes.patch("/update/password", userAuthentication, csrfTokenValidation, updatePasswordInputValidator, main.updatePassword);
userRoutes.patch("/update/prifile-picture", userAuthentication, csrfTokenValidation, multerMiddlewareForProfilePicture, main.updateProfilePicture);
userRoutes.patch("/update/skill/:id", userAuthentication, csrfTokenValidation, idParamValidation, skillsInputValidation, main.updateSkill);
userRoutes.patch("/update/basic-info", userAuthentication, csrfTokenValidation, userBasicInfoInputValidation, main.updateUserBasicInfo);
userRoutes.patch("/update/work/:id", userAuthentication, csrfTokenValidation, idParamValidation, workExpInputValidation, main.updateWorkExperience);

userRoutes.post("/connection/accept/:id", userAuthentication, csrfTokenValidation, idParamValidation, main.acceptConnection);
userRoutes.post("/add/award", userAuthentication, csrfTokenValidation, awardInputValidation, main.addAward);
userRoutes.post("/add/education", userAuthentication, csrfTokenValidation, educationInputValidation, main.addEducation);
userRoutes.post("/add/skill", userAuthentication, csrfTokenValidation, skillsInputValidation, main.addSkill);
userRoutes.post("/add/work", userAuthentication, csrfTokenValidation, workExpInputValidation, main.addWorkExperience);
userRoutes.post("/password", createPasswordInputValidator, main.createPassword);
userRoutes.post("/connection/reject/:id", userAuthentication, csrfTokenValidation, idParamValidation, main.rejectConnection);
userRoutes.post("/connection/send/:id", userAuthentication, csrfTokenValidation, idParamValidation, main.sendConnection);
