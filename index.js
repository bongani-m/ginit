#!/usr/bin/env node

const chalk = require('chalk')
const clear = require('clear')
const figlet = require('figlet')
const Utils = require('./lib/utils')

clear()
console.log(
	chalk.yellow(
		figlet.textSync('Ginit', {
			horizontalLayout: 'full'
		})
	)
)

if(Utils.directoryExists('.git')){
	console.log(chalk.red('Already a git repository!'))
	process.exit()
}

Utils.githubAuth(function(err, authed) {
  if (err) {
    switch (err.code) {
      case 401:
        console.log(chalk.red('Couldn\'t log you in. Please try again.'))
        break
      case 422:
        console.log(chalk.red('You already have an access token.'))
        break
    }
  }
  if (authed) {
    console.log(chalk.green('Sucessfully authenticated!'))
    Utils.createRepo(function(err, url){
      if (err) {
        console.log('An error has occured:')
        console.log(err);
      }
      if (url) {
        Utils.createGitignore(function() {
          Utils.setupRepo(url, function(err) {
            if (!err) {
              console.log(chalk.green('All done!'))
            }
          })
        })
      }
    })
  }
})
