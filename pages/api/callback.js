export default function handler(req, res) {
    if (!req.query.code) {
        return res.redirect("/")
    }
    console.log(req.query)
    return res.status(200).end();
}