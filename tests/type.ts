import { Promise } from "../";

const p = new Promise<number>();

p.then().then(number => number.toString());

p.then(number => number.toString()).then(string => parseInt(string) === 0);

p.then(undefined, () => false).then(numberOrBoolean => {
  if (typeof numberOrBoolean === "number") {
    return numberOrBoolean * 2;
  } else if (typeof numberOrBoolean === "boolean") {
    return false;
  } else {
    throw new Error("Unexpected return type");
  }
});

p.then(
  number => number.toString(),
  () => false
).then(stringOrBoolean => {
  if (typeof stringOrBoolean === "string") {
    return parseInt(stringOrBoolean) === 0;
  } else if (typeof stringOrBoolean === "boolean") {
    return false;
  } else {
    throw new Error("Unexpected return type");
  }
});

p.fulfill(0);
