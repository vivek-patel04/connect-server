// import { EventEmitter } from "node:events";

// const emitter= new EventEmitter();

// emitter.on("greet", (name)=>{console.log(`Hello ${name}`)})

// emitter.emit("greet", "Juhi")

const cursor = {
    createdAt: new Date("9999-12-12"),
    id: "ffffffffffffffffffffffffffffffff",
};
console.log(JSON.stringify(cursor));
