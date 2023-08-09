var express = require('express');
var router = express.Router();
var User = require('../models/user');
const { questiondata, shuffleArray } = require('../models/questions');

// Root 
router.get('/', function (req, res, next) {
	return res.render('index.ejs');
});

// Download
router.get('/download', function (req, res, next) {
	return res.render('download.ejs');
});

// Download Handler
router.get('/download/file', function(req, res, next) {
    const filePath = __dirname + "/../public/TriviaGPT.zip";
    res.download(filePath, 'TriviaGPT.zip', function(err) {
        if (err) {
            console.error(err);
            res.status(500).send('File not found or some error occurred');
        }
    });
});

// Register
router.get('/register', function (req, res, next) {
	return res.render('register.ejs');
});

// Register handler
router.post('/register', function(req, res, next) {
	console.log(req.body);
	var personInfo = req.body;

	if(!personInfo.email || !personInfo.username || !personInfo.password || !personInfo.passwordConf){
		res.send();
	} else {
		if (personInfo.password == personInfo.passwordConf) {

			User.findOne({email:personInfo.email},function(err,data){
				if(!data){
					var c;
					User.findOne({},function(err,data){

						if (data) {
							console.log("if");
							c = data.unique_id + 1;
						}else{
							c=1;
						}

						var newPerson = new User({
							unique_id:c,
							email:personInfo.email,
							username: personInfo.username,
							password: personInfo.password,
							passwordConf: personInfo.passwordConf
						});

						newPerson.save(function(err, Person){
							if(err)
								console.log(err);
							else
								console.log('Success');
						});

					}).sort({_id: -1}).limit(1);
					res.send({"Success":"You are regestered,You can login now."});
				}else{
					res.send({"Success":"Email is already used."});
				}

			});
		}else{
			res.send({"Success":"password is not matched"});
		}
	}
});

// Login
router.get('/login', function (req, res, next) {
	return res.render('login.ejs');
});

// Login handler
router.post('/login', function (req, res, next) {
	
	User.findOne({email:req.body.email},function(err,data){
		if(data){
			
			if(data.password==req.body.password){
				req.session.userId = data.unique_id;
				res.send({"Success":"Success!"});
				
			}else{
				res.send({"Success":"Wrong password!"});
			}
		}else{
			res.send({"Success":"This Email Is not regestered!"});
		}
	});
});

// Profile
router.get('/profile', function (req, res, next) {
	console.log("profile");
	User.findOne({unique_id:req.session.userId},function(err,data){
		console.log("data");
		console.log(data);
		if(!data){
			res.redirect('/');
		}else{
			return res.render('profile.ejs', {"name":data.username,"email":data.email});
		}
	});
});

// Category 
router.get('/category', function (req, res, next) {
	res.render('category.ejs');
});

// Handle favicon.ico request
router.get('/favicon.ico', (req, res) => res.status(204));

let submissionCount = 0;
// Submit Answer For Question
router.post('/next', function(req, res) {
	console.log("Initial Session Data:", req.session);
	console.log("Entered POST /next");
	const category = req.session.category;
    const userAnswer = parseInt(req.body.answer, 10);

	// added
	submissionCount++;
	// end added
	
	console.log("User Answer: " + userAnswer + "submission number" + submissionCount);
	const currentQuestion = req.session.questions[req.session.currentQuestionIndex];
	console.log("Correct Answer (from session): " + currentQuestion.answer);
	console.log("Correct Answer (from question object): " + currentQuestion.options[currentQuestion.answer]);


	if (!req.session.score) {
        req.session.score = 0;
    }

	const currentCorrectAnswer = parseInt(currentQuestion.answer, 10);
	if (currentCorrectAnswer === userAnswer) {
        req.session.score++;
		console.log("Score incremented");
		req.session.successMessage = 'Well done! Your answer is correct!';
		if (req.session.currentQuestionIndex < req.session.questions.length - 1) {
			req.session.currentQuestionIndex++;
			console.log('New currentQuestionIndex:', req.session.currentQuestionIndex);


			req.session.save(() => {
				console.log("Exiting POST /next");
				res.redirect(`/${category}`);
			});
		} else {
			req.session.finished = true;
			req.session.save(() => {
				res.redirect('/gameover'); 
			});   
		}
    } else {
		console.log("Answer is incorrect");
		req.session.successMessage = 'Wrong Answer -> Game Over ';
		req.session.finished = false;
		req.session.save(() => {
    		res.redirect('/gameover');
		}); 
	}

	console.log("Current Score: " + req.session.score);
});

// Game Over
router.get('/gameover', function(req, res) {
	const score = req.session.score|| 0;
	const finished = req.session.finished|| false;
	req.session.currentQuestionIndex = 0;
	delete req.session.questions;
	delete req.session.score;
	delete req.session.finished;
	delete req.session.category;
	res.render('gameover', { score: score, finished: finished });
});

// Logout
router.get('/logout', function (req, res, next) {
	console.log("logout")
	if (req.session) {
   
		req.session.destroy(function (err) {
			if (err) {
				return next(err);
			} else {
				return res.redirect('/');
			}
		});
	}
});

// Forget Pass
router.get('/forgetpass', function (req, res, next) {
	res.render("forget.ejs");
});

// Forget Pass Handler
router.post('/forgetpass', function (req, res, next) {
	User.findOne({email:req.body.email},function(err,data){
		console.log(data);
		if(!data){
			res.send({"Success":"This Email Is not regestered!"});
		}else{
			if (req.body.password==req.body.passwordConf) {
			data.password=req.body.password;
			data.passwordConf=req.body.passwordConf;

			data.save(function(err, Person){
				if(err)
					console.log(err);
				else
					console.log('Success');
					res.send({"Success":"Password changed!"});
			});
		}else{
			res.send({"Success":"Password does not matched! Both Password should be same."});
		}
		}
	});
	
});

// Submit Answer for any category
router.post('/submitAnswer/:category', function(req, res) {
    const category = req.params.category;

	console.log('Entered /submitAnswer/' + category);
    if (questiondata[category]) {
		const userAnswer = req.body.userAnswer;
        const currentQuestion = req.session.questions[req.session.currentQuestionIndex];

		console.log('User Answer for submission:', userAnswer);
        console.log('Correct Answer:', currentQuestion.correctAnswer);


		if (userAnswer == currentQuestion.correctAnswer) {
            req.session.score = (req.session.score || 0) + 1;
			console.log('Correct Answer! Score:', req.session.score);
        } else{
			console.log('Incorrect Answer.');
		}
		req.session.currentQuestionIndex++;
		console.log('Incremented currentQuestionIndex to:', req.session.currentQuestionIndex);


        res.redirect(`/${category}`);
    } else {
		console.log('Invalid category:', category);
        res.redirect('/category-not-found');
    }
});

// Category not found
router.get('/category-not-found', function(req, res) {
    res.render('categorynotfound');  
});

// Category Handler
router.get('/:category', function(req, res) {
	const category = req.params.category;
	console.log("Request category: " + category);
	console.log("Session category: " + req.session.category);

	if (questiondata[category]) {
        req.session.category = category;
		console.log("Session category after set: " + req.session.category);
		
		if (!req.session.currentQuestionIndex) {
			req.session.currentQuestionIndex = 0;
		}

		if (!req.session.questions || req.session.questions.length === req.session.currentQuestionIndex) {
				req.session.questions = shuffleArray(questiondata[category]);
		}

		if (req.session.currentQuestionIndex >= req.session.questions.length) {
			return res.redirect('/gameover');
		}

    	const currentQuestion = req.session.questions[req.session.currentQuestionIndex];
		req.session.successMessage = '';

    	res.render('questioncard', { question: currentQuestion,  score: req.session.score,
		successMessage: req.session.successMessage, category: req.session.category });
	} else {
		res.redirect('/category-not-found');
	}
});


// 404 Handler
router.use(function(req, res) {
    res.status(404).render('categorynotfound');
});

module.exports = router;
