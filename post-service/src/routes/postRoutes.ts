import express from "express";
import * as main from "../controllers/index.js";
import { userAuthentication } from "../middlewares/userAuthentication.js";
import { csrfTokenValidation } from "../middlewares/validateCsrfToken.js";
import { commentIDValidation, commentInputValidation, cursorValidation, postIDValidation, postInputValidation } from "../middlewares/inputValidator.js";

export const postRoutes = express.Router();

postRoutes.post("/add/post", userAuthentication, csrfTokenValidation, postInputValidation, main.createPost);
postRoutes.post("/add/like/:postID", userAuthentication, csrfTokenValidation, postIDValidation, main.addLike);
postRoutes.post("/add/comment/:postID", userAuthentication, csrfTokenValidation, postIDValidation, commentInputValidation, main.addComment);

postRoutes.delete("/del/post/:postID", userAuthentication, csrfTokenValidation, postIDValidation, main.deletePost);
postRoutes.delete("/del/like/:postID", userAuthentication, csrfTokenValidation, postIDValidation, main.deleteLike);
postRoutes.delete("/del/comment/:postID/:commentID", userAuthentication, csrfTokenValidation, postIDValidation, commentIDValidation, main.deleteComment);

postRoutes.get("/likes/count/:postID", userAuthentication, postIDValidation, main.getLikeCount);
postRoutes.get("/likes/:postID", userAuthentication, postIDValidation, cursorValidation, main.getLikes);
postRoutes.get("/comments/count/:postID", userAuthentication, postIDValidation, main.getCommentCount);
postRoutes.get("/comments/:postID", userAuthentication, postIDValidation, cursorValidation, main.getComments);
postRoutes.get("/posts", userAuthentication, cursorValidation, main.getFeedPosts);
postRoutes.get("/posts/user", userAuthentication, cursorValidation, main.getUserOwnPosts);
postRoutes.get("/post/:postID", userAuthentication, postIDValidation, main.getPost);
