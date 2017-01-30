'use strict'

const inquirer = require('inquirer')
const CLI = require('clui')
const Spinner = CLI.Spinner
const GitHubApi = require('github')
const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const touch = require('touch')
const git = require('simple-git')()
const Preferences = require('preferences')
const github = new GitHubApi({
    version: '3.0.0'
})

class Utils {

    static getCurrentDirectoryBase() {
        return path.basename(process.cwd())
    }

    static directoryExists(filepath) {
        try {
            return fs.statSync(filepath).isDirectory()
        } catch (err) {
            return false
        }
    }

    static getGithubCredentials(cb) {
        const questions = [{
            type: 'input',
            message: 'Enter your Github username or e-mail address:',
            name: 'username',
            validate(value) {
                if (value.length) {
                    return true
                } else {
                    return 'Please enter your username or e-mail address'
                }
            }
        }, {
            type: 'password',
            message: 'Enter your password:',
            name: 'password',
            validate(value) {
                if (value.length) {
                    return true
                } else {
                    return 'Please enter your password'
                }
            }
        }]

        inquirer.prompt(questions).then(cb)
    }

    static getGithubToken(cb) {
        const prefs = new Preferences('ginit')
        if (prefs.github && prefs.github.token) {
            return cb(null, prefs.github.token)
        }
        Utils.getGithubCredentials((credentials) => {
            const status = new Spinner('Authenticating you, please wait...')
            status.start()

        github.authenticate(
            _.extend({
                    type: 'basic',
                },
                credentials
            )
        )

        github.authorization.create({
            scopes: ['user', 'public_repo', 'repo', 'repo:status'],
            note: 'ginit, the command-line tool for initalizing Git repos'
        }, (err, res) => {
            status.stop()
        if (err) {
            return cb(err)
        }
        if (res.token) {
            prefs.github = {
                token: res.token
            }
            return cb(null, res.token)
        }
        return cb()
    })

    })
    }

    static createRepo(cb) {
        const argv = require('minimist')(process.argv.slice(2))
        const questions = [{
            type: 'input',
            name: 'name',
            message: 'Enter a name for the repository:',
            default: argv._[0] || Utils.getCurrentDirectoryBase(),
            validate: function(value) {
                if (value.length) {
                    return true
                } else {
                    return 'Please enter a name for the repository'
                }
            },
        }, {
            type: 'input',
            name: 'description',
            message: 'Optionally enter a description of the repository:',
            default: argv._[1] || null,
        }, {
            type: 'list',
            name: 'visibility',
            message: 'Public or private:',
            choices: ['public', 'private'],
            default: 'public',
        }]
        inquirer.prompt(questions).then((answers) => {
            const status = new Spinner('Creating repository...')
            status.start()
        const data = {
            name: answers.name,
            description: answers.description,
            private: (answers.visibility === 'private')
        }
        github.repos.create(
            data,
            function(err, res) {
                status.stop()
                if (err) {
                    return cb(err)
                }
                return cb(null, res.ssh_url)
            }
        )
    })
    }

    static createGitignore(cb) {
        const fileList = _.without(fs.readdirSync('.'), '.git', '.gitignore')
        if (fileList.length) {
            const questions = [{
                type: 'checkbox',
                name: 'ignore',
                message: 'Select the files and/or folders you wish to ignore:',
                choices: fileList,
                default: ['node_modules', 'bower_components']
            }]
            inquirer.prompt(questions).then((answers) => {
                fs.writeFileSync('.gitignore', answers.ignore.join('\n'))
            return cb()
        })
        } else {
            touch('.gitignore')
            return cb()
        }
    }

    static setupRepo(url, cb) {
        const status = new Spinner('Setting up the repository...')
        status.start()

        git
            .init()
            .add('.gitignore')
            .add('./*')
            .commit('Initial commit')
            .addRemote('origin', url)
            .push('origin', 'master')
            .then(function() {
                status.stop()
                return cb()
            })
    }

    static githubAuth(cb) {
        Utils.getGithubToken(function(err, token) {
            if (err) {
                return cb(err)
            }
            github.authenticate({
                type: 'oauth',
                token: token
            })
            return cb(null, token)
        })
    }
}

module.exports = Utils;
