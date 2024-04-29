const { ObjectId } = require("mongodb")
const petsCollection = require("../db").db().collection("pets")
const sanitizeHtml = require("sanitize-html")

const sanitizeOptions = {
    allowedTags: [],
    allowedAttributes: {}
}

exports.submitContact = async function (req, res) {

    if (req.body.secret.toUpperCase() !== "PUPPY") {
        console.log("spam detected")
        return res.json({ success: 'Sorry!' })
    }

    if (!ObjectId.isValid(req.body.petId)) {
        console.log("invalid id detected")
        return res.json({ success: 'Sorry!' })
    }

    const doesPetExist = await petsCollection.findOne({ _id: new ObjectId(req.body.petId) })

    if (!doesPetExist) {
        console.log("pet does not exist")
        return res.json({ success: 'Sorry!' })
    }

    const ourObject = {
        name: sanitizeHtml(req.body.name, sanitizeOptions),
        email: sanitizeHtml(req.body.email, sanitizeOptions),
        comment: sanitizeHtml(req.body.comment, sanitizeOptions)
    }
    console.log(ourObject)
    res.send("Thanks for sending data to us")
}