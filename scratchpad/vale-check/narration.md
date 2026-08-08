## open-buried

Meet Leo. One desk, and more work than one person can physically get through. So Leo does what anyone would do. He gets help. And that decision, right there, is the whole subject of this lesson.

## roadmap

Leo's building an agency. Starts with one agent. Then two. Then twelve. And here's what nobody warned him about: every single thing that was easy with one agent breaks the second there's another one. That's what these thirteen buildings are. Thirteen ways it breaks.

## what-is-a-turn

Before any of that, thirty seconds on how this actually works. Leo sends the model a list of messages. What comes back is not just text. It's more like a sealed envelope. Inside is what the model wrote. And stapled to the outside is a little tag saying why it stopped writing. Most people only ever open the envelope. The tag is the part that runs the loop.

## term-what-comes-back

Watch what actually comes back. Not a string. A structure. The part everyone reads is inside. And the part that decides whether the loop goes round again is that little tag on the outside: stop_reason.

## why-a-loop-exists

So why is there a loop at all? Here's the bit that surprises people. A tool is just a function Leo described to the model. And the model cannot run it. It has no hands. All it can do is say: please run this one, with these arguments. So Leo runs it. He hands the result back. And the model carries on thinking. That handing-back is the loop. Nobody designed it that way for elegance. It exists because the model can't reach the hammer.

## term-why-a-loop

Here's the whole loop in one picture. The model wants the hammer. It cannot pick it up. So it passes Leo a note that says tool_use. Leo swings the hammer, hands the result back, and the model keeps going. That hand-back is the loop.

## two-different-limits

One more thing, and this one trips up almost everybody. There are two completely different limits, living in two completely different places. How much goes in front of the model is the size of the desk. How much it's allowed to write back is how long the pen lasts. Two limits. Two places. And when something goes wrong, knowing which one got hit is most of the fix.

## term-two-limits

Two limits, side by side, so they never get mixed up again. On the left, the desk fills up and nothing more fits: that's model_context_window_exceeded. On the right, the pen runs out mid-sentence: that's max_tokens. Different side, different fix.

## term-whose-field

One last thing before we go on, because this trips up more people than anything else on the list. Some of these names ship with the API. They arrive whether anyone asks or not. But citation_id and conflict_detected? Nobody hands those over. Leo invents them, in his own schema, and agrees on them with himself. Search the docs for them and there's nothing there.

## no-brakes

But before anybody gets hired, look at what Leo already built. One agent, running in a loop. And a loop, as anyone who's built one knows, has exactly one hard question: when does it stop?

## listen-not-count

Quick question. How does anyone know when somebody's finished talking? Nobody counts sentences. They wait for the shape of it. The trailing off. That little pause meaning, okay, your turn. Leo's agent does exactly the same thing. It says when it's done. The trick is listening instead of counting.

## stop-reason

So Leo's agent is looping. Tool, result, tool, result. When does it stop? Leo's first instinct is to count rounds. That instinct is wrong. The answer already came back in the response. It's called stop_reason, and it has two positions. tool_use, run the tool, go round again. end_turn, finished. And that iteration cap Leo added? That's a seatbelt. It is not the steering wheel.

## three-blank-letters

Now imagine three letters arrive and all three just stop halfway down the page. Same blank space at the bottom. But one writer ran out of paper. One was handed an envelope too small to post. And one read the request and decided, nope, not writing that. Three identical-looking pages, three unrelated problems. Would photocopying any of them and posting it again fix a single one? No.

## three-coats

Then it starts failing. And the log says, quote, incomplete output. Thanks, log. Because that's not one bug, it's three, and they're all wearing the same coat. max_tokens? A budget Leo set himself. model_context_window_exceeded? The input doesn't fit anymore. refusal? Not a bug at all. A decision. Retry any of them unchanged and back comes the exact same failure.

## queue-of-helpers

Now the hiring. And this is where it gets interesting, because the instinct is to hire for everything, and that instinct is wrong more often than it's right.

## note-in-your-hand

Leo is holding a note. Three sentences on it. And he walks it across the office, hands it to a colleague, and asks them to read it back to him. That's it. That's what spawning a subagent for something already in context looks like. Not delegation. A longer walk to the same answer.

## dont-delegate

Work's piling up, so Leo hires. Naturally. But here's the one that gets everybody: most of the time, he shouldn't. If the answer is already sitting in his own context, spinning up a helper to go read it again isn't clever architecture. It's a slower version of Leo.

## proofreading-pass

Ever proofread your own writing? Catching typos and checking the logic and fixing the formatting all in one read, and the eye just slides over everything. Editors worked this out ages ago. One pass for spelling. Another for structure. Another for style. Same trick applies here.

## three-passes

So when Leo does split the work up, he splits it by thinking, not by file. Reviewing a pull request? A style pass. Then a security pass. Then a docs pass. Three clean sweeps, merged at the end, beat one giant prompt holding all three thoughts at once. Every time.

## script-vs-goal

Say this one really does need help. Now: what goes in the briefing? Because there are two very different ways to tell somebody what's wanted.

## directions-vs-destination

Two ways to send someone somewhere. Turn-by-turn directions: left here, right there, third exit. Works perfectly, right up until there's roadworks. Then they're just standing there. Or tell them the destination and when it matters, and suddenly a closed road is a minor inconvenience instead of a full stop.

## brief-with-goals

And how Leo briefs them? That's everything. Hand a subagent exact search queries, and the moment reality doesn't match, it shrugs and reports insufficient results. Give it the actual goal, and what a good source looks like, and it finds another way in. Same model. Completely different behaviour.

## dominoes

Next problem. Leo has helpers, they're briefed, and now they're all going at once. Which is great, right up until two of them needed to happen in a specific order.

## ice-before-baking

Nobody ices a cake that hasn't been baked. Obvious. So when a recipe has a real dependency in it, Leo doesn't hand over the steps and hope they're read in order. He hands over the flour first.

## forced-first

Some tools need each other. lookup_citations wants a DOI, but extract_metadata hasn't run yet. And hoping the model picks the right order on its own? That's not a design. That's a wish. So Leo forces extract_metadata on turn one, then hands control back with auto.

## twelve-washing-machines

Twelve loads of laundry. Twelve machines, all free, all sitting there. And in goes one load, wait, out it comes, in goes the next. Nobody would do that. But from the outside, that is exactly what sequential subagent calls look like.

## twelve-at-once

Now flip it around. Twelve precedents, none depending on each other, processed one. At. A. Time. That's three minutes of watching a spinner. All twelve Task calls go out in a single turn instead, and they run together. Now the wait is the slowest one, not all of them.

## canyon-shout

The next chapter is the one worth paying most attention to, because this is where multi-agent systems don't just slow down. This is where they quietly produce wrong answers and nobody notices.

## shift-handover

A nurse comes on shift. She doesn't magically know what happened to the patient overnight. Somebody has to hand it over. What was observed, what proves it, who said so, and when. And if the outgoing nurse just says 'yeah, rough night' and walks off? Everything that mattered is gone.

## no-inheritance

This one. This is where multi-agent systems actually die. A subagent does not inherit what Leo knows. It knows nothing. So the findings go straight into its prompt: claim, evidence, source, date. A readable prose summary feels helpful, and it quietly drops the evidence on the floor.

## two-witnesses

Two witnesses describe the same man. One says tall. The other says short. Average them, and out goes a description of someone of medium height, who nobody saw, who doesn't exist. The evidence just got worse.

## two-numbers

Two agents come back. One says fifty billion, no methodology. The other says thirty-five billion, plus or minus seven, ninety-five percent confidence. Average them? That invents a number nobody measured. Leo sets conflict_detected, keeps both, shows the methodology, and lets the reader decide.

## evidence-bag

Police tag evidence at the scene. Not back at the station, not at the courthouse. At the scene, the moment it's picked up. Because an untagged bag is just a thing in a bag, and no court will touch it. Nobody can say where it came from.

## citation-id

Another one. Leo's final report states a crucial fact, and nobody can trace where it came from, because somewhere upstream an agent flattened the sources into prose. So a citation_id gets tagged at the very first agent that finds the evidence. Then that ID travels all the way down, unbroken.

## burst-pipes

And finally: things break. Not might break. Will break. So the last chapter isn't about prevention. It's about three in the morning, when it already has.

## back-from-holiday

Back from two weeks off. Two hundred emails. A colleague could say 'read all of it, good luck.' Or 'three things changed, here they are, the rest is noise.' Same information. Wildly different afternoon.

## tell-it-what-changed

Sometimes nothing crashed. The world just moved. Leo reviewed twelve files, a developer edited three. He could make the agent re-read all twelve and pay twice for the same reading. Or say: these three changed, look at those. Same result, a fraction of the cost.

## corrupted-autosave

A document crashes. And there's an autosave sitting right there. Tempting. But that file is half-corrupted, and opening it inherits every bit of the mess. So Leo doesn't. He takes the pages he knows are good, opens a clean document, and pastes them in.

## checkpoint

And when it really does crash? Twelve documents into eighteen, every agent half-done. Resuming drags every stale tool result back in along with it. So what's finished goes into a structured checkpoint file, a fresh session starts, and the checkpoint gets injected.

## three-burnt-dishes

Catering a banquet. A hundred dishes go out, three come back burnt. Throw out the entire banquet and start cooking from scratch? No. Find the three, fix the three, send the three back out.

## three-hundred

Now scale that up. Ten thousand documents in one batch, three hundred fail on context length. And the result file names every failure by custom_id. So exactly those three hundred come out, get chunked, and go back in. Re-running ten thousand to fix three percent is how batch savings evaporate.

## thirteen-doors

That's all five chapters. And every one of them is a door in this district, with a real question behind it.

## go-find-out

So that's the district. Thirteen buildings, thirteen decisions. Not one of them answered by memorising a definition. Every one is a call somebody had to make at three in the morning with the pipeline down. Leo has the reasoning now. So do you. Go use it.
