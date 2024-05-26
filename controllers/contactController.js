const validator = require("validator")
const nodemailer = require("nodemailer")
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const { ObjectId } = require("mongodb")
const petsCollection = require("../db").db().collection("pets")
const contactsCollection = require("../db").db().collection("contacts")
const sanitizeHtml = require("sanitize-html")

const sanitizeOptions = {
    allowedTags: [],
    allowedAttributes: {}
}

exports.submitContact = async function (req, res, next) {

    if (req.body.secret.toUpperCase() !== "PUPPY") {
        console.log("spam detected")
        return res.json({ success: 'Sorry!' })
    }

    if (typeof req.body.name !== "string") {
        req.body.name = ""
    }

    if (typeof req.body.email !== "string") {
        req.body.email = ""
    }

    if (typeof req.body.comment !== "string") {
        req.body.comment = ""
    }

    if (validator.isEmail(req.body.email) === false) {
        console.log("invalid email detected")
        return res.json({ success: 'Sorry!' })
    }

    if (!ObjectId.isValid(req.body.petId)) {
        console.log("invalid id detected")
        return res.json({ success: 'Sorry!' })
    }

    req.body.petId = new ObjectId(req.body.petId)
    const doesPetExist = await petsCollection.findOne({ _id: req.body.petId })

    if (!doesPetExist) {
        console.log("pet does not exist")
        return res.json({ success: 'Sorry!' })
    }

    const ourObject = {
        petId: req.body.petId,
        name: sanitizeHtml(req.body.name, sanitizeOptions),
        email: sanitizeHtml(req.body.email, sanitizeOptions),
        comment: sanitizeHtml(req.body.comment, sanitizeOptions)
    }
    console.log(ourObject)


    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({ username: 'api', key: process.env.MAILGUNAPIKEY });

    if (ourObject.email !== 'test@test.com') {
        try {
            const promise1 = mg.messages.create(process.env.MAILGUNDOMAIN, {
                from: "petadoption@localhost",
                to: [ourObject.email],
                subject: `Thank you for your interest in ${doesPetExist.name}`,
                html: `<h3 style="color: purple; font-size: 30px; font-weight: normal">Thank you!</h3>
            <p>We appreciate your interest in ${doesPetExist.name} and one of our staff members will reach out to your shortly! Below is a copy of the message you sent us for your personal records:</p>
            <p><em>${ourObject.comment}</em></p>
            `,
                // text: `Name: ${ourObject.name}\nEmail: ${ourObject.email}\nComment: ${ourObject.comment}`
            })


            const promise2 = mg.messages.create(process.env.MAILGUNDOMAIN, {
                from: "petadoption@localhost",
                to: "mycadworld@gmail.com",
                subject: `Someone is interested in ${doesPetExist.name}`,
                html: `<h3 style="color: purple; font-size: 30px; font-weight: normal">New contact!</h3>
                <p>Name: ${ourObject.name}<br>
                Pet Interested In: ${doesPetExist.name}<br>
                Email: ${ourObject.email}<br>
                Message: ${ourObject.comment}<br
                </p>
                `,
            })
            const promise3 = await contactsCollection.insertOne(ourObject)

            await Promise.all([promise1, promise2, promise3])
        } catch (error) {
            next(error)
        }
    } else {
        await contactsCollection.insertOne(ourObject)
            .then(msg => console.log(msg)) // logs response data
            .catch(err => console.log(err)); // lo
    }
    /*
    var transport = nodemailer.createTransport({
        host: "sandbox.smtp.mailtrap.io",
        port: 2525,
        auth: {
            user: process.env.MAILTRAPUSERNAME,
            pass: process.env.MAILTRAPPASSWORD
        }
    })

    try {
        const promise1 = transport.sendMail({
            to: ourObject.email,
            from: "petadoption@localhost",
            subject: `Thank you for your interest in ${doesPetExist.name}`,
            html: `<h3 style="color: purple; font-size: 30px; font-weight: normal">Thank you!</h3>
            <p>We appreciate your interest in ${doesPetExist.name} and one of our staff members will reach out to your shortly! Below is a copy of the message you sent us for your personal records:</p>
            <p><em>${ourObject.comment}</em></p>
            `,
            // text: `Name: ${ourObject.name}\nEmail: ${ourObject.email}\nComment: ${ourObject.comment}`
        })

        const promise2 = transport.sendMail({
            to: "petadoption@localhost",
            from: "petadoption@localhost",
            subject: `Someone is interested in ${doesPetExist.name}`,
            html: `<h3 style="color: purple; font-size: 30px; font-weight: normal">New contact!</h3>
            <p>Name: ${ourObject.name}<br>
            Pet Interested In: ${doesPetExist.name}<br>
            Email: ${ourObject.email}<br>
            Message: ${ourObject.comment}<br
            </p>
            `,
        })

        const promise3 = await contactsCollection.insertOne(ourObject)

        await Promise.all([promise1, promise2, promise3])
    } catch (error) {
        next(error)
    }
    */


    res.send("Thanks for sending data to us")
}

exports.viewPetContacts = async (req, res, next) => {
    if (!ObjectId.isValid(req.params.id)) {
        console.log("invalid id detected")
        return res.redirect("/")
    }

    const pet = await petsCollection.findOne({ _id: new ObjectId(req.params.id) })

    if (!pet) {
        console.log("pet does not exist")
        return res.redirect("/")
    }
    const contacts = await contactsCollection.find({ petId: new ObjectId(req.params.id) }).toArray() // toArray() 로 간단한 Json 배열로 반환
    res.render("pet-contacts", { contacts, pet })
}