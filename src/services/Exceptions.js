function FileNotFoundException(message) {
    this.message = message || "File does not exist!";
    this.name = "FileNotFoundException";
}

function WrongTypeException(message) {
    this.message = message || "Data type is wrong!";
    this.name = "WrongTypeException";
}

//export { FileNotFoundException, WrongTypeException };
module.exports = {
    FileNotFoundException,
    WrongTypeException,
};
