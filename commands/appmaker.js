const Discord = require('discord.js');
const Promise = require("bluebird");
const { hoster_application_channel, hosters_apply_logs } = require('../config.json');

module.exports = {
    name: 'apply',
    description: 'Create an Application',
    execute(message, args) {
        if (message.channel.name === hoster_application_channel) {
            return Promise.resolve(message.author.id)
                .then(function sendWelcomeApplication(){
                    let applicationEmbed = {
                        color: 0x0099ff,
                        title: `Apply for PWM Event Hoster Application: ${message.author.username}`,
                        description: 'Thank you for applying for PWM Event Hoster! Make sure to answer all the questions truthfully.',
                    };

                    return message.author.send({embed: applicationEmbed})
                        .then(function sendReady(appMsg) {
                            const yesEmoji = message.channel.guild.emojis.cache.find(emoji => emoji.name === 'yes');
                            const cancelEmoji = message.channel.guild.emojis.cache.find(emoji => emoji.name === 'no');
                            let readyAppEmbed = new Discord.MessageEmbed()
                                .setColor('#0099ff')
                                .setTitle(`Ready?`)
                                .addFields(
                                    { name: `${yesEmoji} Begin`, value: 'Begin filling out the application', inline: true },
                                    { name: `${cancelEmoji} Cancel`, value: 'Cancel the application', inline: true},
                                )
                                .setDescription(`Ready to apply? (Use reactions to continue)`)
                                .setFooter('You can type "cancel" at any time to exit.')

                            return message.author.send(readyAppEmbed)
                                .then(function reactToMessage(readyMsg) {
                                    return Promise.map([yesEmoji, cancelEmoji], function forEachEmojiReact(emoji){
                                        return readyMsg.react(emoji)
                                    })
                                        .then(function resolveReaction(reaction) {
                                            const filter = (reaction, user) => ['no', 'yes'].includes(reaction.emoji.name) && user.id !== readyMsg.author.id; //whatever emote you want to use, beware that .await.Reactions can only check a singel emote
                                            return readyMsg.awaitReactions(filter, { max: 1})
                                                .then((collected) => {
                                                    if (collected.first().emoji.id === yesEmoji.id) {
                                                        const reactingMessage = collected.first().message;
                                                        const questions = [
                                                            '1. Type Ok to start the questions',
                                                            '2. Tell us about yourself',
                                                            '3. Which server are you applying for?',
                                                            '4. Why are you interested in hosting ingame events?',
                                                            '5. How much time do you spend on PWM?',
                                                            '6. How do you rate your knowledge on the game?',
                                                            '7. Do you have any previous hosting experience? (in this game, other game or real life)',
                                                            '8. How would you rate your fellowship with the other players on your server?',
                                                            '9. Anything else you want to add?',
                                                        ];
                                                        applicationEmbed.fields = [];
                                                        applicationEmbed.description = 'Enter the answers to the question(s) below.';
                                                        let previousMessage = null;
                                                        function sendQuestion(question, applicationMessage) {
                                                            if (questions.length) {
                                                                applicationEmbed.fields.push({ name: question, value: '\u200b', inline: true})
                                                                let saveMsg = applicationMessage;
                                                                return (applicationMessage? applicationMessage.delete({timeout:1000}) : Promise.resolve(null))
                                                                    .then(function pushNewMessage(result) {
                                                                        return message.author.send({embed: applicationEmbed})
                                                                        .then(function (recentMsg) {
                                                                            return recentMsg.channel.awaitMessages(response => response.content, {
                                                                                    max: 1,
                                                                            })
                                                                            .then((collected) => {
                                                                                const answer = collected.first().content;
                                                                                if (answer.toLowerCase() === 'cancel') {
                                                                                    return recentMsg.delete({timeout:1000})
                                                                                        .then(function cancel(){
                                                                                            return 'cancel'
                                                                                        })
                                                                                }
                                                                                if (answer.length > 1024) {
                                                                                    return message.author.send({embed: {title: 'Character Limit Exceeded', description: 'Please answer the questions in 1024 characters or less'}})
                                                                                        .then(function restartQuestion(){
                                                                                            applicationEmbed.fields.pop();
                                                                                            return sendQuestion(question, null)
                                                                                        })
                                                                                }
                                                                                applicationEmbed.fields[applicationEmbed.fields.length-1].value = answer;
                                                                                return recentMsg.delete({timeout:1000})
                                                                                    .then(function sendUpdate(){
                                                                                        return message.author.send({embed: applicationEmbed})
                                                                                    })
                                                                            })
                                                                            .catch((err) => {
                                                                                return message.author.send(err);
                                                                            });
                                                                        })
                                                                    })

                                                            }
                                                        }
                                                        return Promise.each(questions, function (question) {
                                                            if (!questions.cancelled) {
                                                                return sendQuestion(question, previousMessage)
                                                                    .then(function setPrevMsg(newMsg){
                                                                        questions.cancelled = false;
                                                                        if (newMsg === 'cancel') {
                                                                            questions.cancelled = true
                                                                        }
                                                                        previousMessage = newMsg
                                                                    })
                                                            }
                                                        })
                                                            .then(function() {
                                                                function cancelApp() {
                                                                    applicationEmbed.title = '[CANCELED] ' + applicationEmbed.title;
                                                                    applicationEmbed.description = 'You have canceled this application.';
                                                                    applicationEmbed.fields = [];
                                                                    return message.author.send({embed: applicationEmbed})
                                                                }
                                                                if (questions.cancelled) {
                                                                    return cancelApp()
                                                                }
                                                                let submitAppEmbed = new Discord.MessageEmbed()
                                                                    .setColor('#0099ff')
                                                                    .setTitle(`Are you sure?`)
                                                                    .setDescription(`Are you sure you want to submit your application?`);

                                                                return message.author.send(submitAppEmbed)
                                                                    .then(function reactToMsg(submitApp) {
                                                                        return Promise.map([yesEmoji, cancelEmoji], function forEachEmojiReact(emoji) {
                                                                            return submitApp.react(emoji)
                                                                        })
                                                                            .then(function resolveReaction() {
                                                                                const filter = (reaction, user) => ['no', 'yes'].includes(reaction.emoji.name) && user.id !== readyMsg.author.id; //whatever emote you want to use, beware that .await.Reactions can only check a singel emote
                                                                                return submitApp.awaitReactions(filter, { max: 1})
                                                                                    .then(function handleReaction(collection){
                                                                                        if(collection.first().emoji.id === cancelEmoji.id) {
                                                                                            return cancelApp
                                                                                        }

                                                                                        const submissionChannel = message.channel.guild.channels.cache.find(channel => channel.name === hosters_apply_logs);
                                                                                        previousMessage.embeds[0].setDescription(`This is the application for PWM Event Hoster Application, sent by ${message.author.username}.`)
                                                                                        return Promise.all([submissionChannel.send(previousMessage.embeds[0]), message.author.send({
                                                                                            embed: {
                                                                                                title: 'Application Submitted',
                                                                                                description:'Your application has successfully been submitted.'
                                                                                            }
                                                                                        })])
                                                                                    });

                                                                            })
                                                                    })
                                                            })
                                                    }
                                                })
                                        })
                                })
                        })
                })
                .catch(function(err){
                    console.log(err)
                })
        }
    },
};
