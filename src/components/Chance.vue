<template>
    <div class="space chance" :class="{ active: active }" @click="popup">
        <div class="container">
            <div class="name">Chance</div>
            <div>
                <i :class="`drawing fas fa-question text-${this.color}`"></i>
            </div>
        </div>
    </div>
</template>

<script>
import { mapGetters } from "vuex";
export default {
    data() {
        return {
            name: "Chance",
            active: false,
            color: "red-500",
            cards: [
                {
                    content: ["Advance to Go", "Collect $200"],
                    action: () => {
                        this.$store.dispatch("movePlayerToSpace", {
                            username: this.player.username,
                            spaceName: "Go"
                        });
                    }
                },
                {
                    content: ["Advance to Illinois Ave."],
                    action: () => {
                        this.$store.dispatch("movePlayerToSpace", {
                            username: this.player.username,
                            spaceName: "Illinois Avenue"
                        });
                    }
                },
                {
                    content: [
                        "Advance to nearest Utility",
                        "If unowned, you may buy it from the Bank",
                        "If owned, throw dice and pay owner a total ten times the amount thrown."
                    ],
                    action: () => {}
                },
                {
                    content: [
                        "Advance to the nearest Railroad.",
                        "If Railroad is unowned, you may buy it from the Bank.",
                        "If owned, pay owner twice the rental to which he/she is otherwise entitled."
                    ],
                    action: () => {}
                },
                {
                    content: [
                        "Advance to the nearest Railroad.",
                        "If Railroad is unowned, you may buy it from the Bank.",
                        "If owned, pay owner twice the rental to which he/she is otherwise entitled."
                    ],
                    action: () => {}
                },
                {
                    content: [
                        "Advance to St. Charles Place",
                        "If you pass Go, collect $200"
                    ],
                    action: () => {
                        this.$store.dispatch("movePlayerToSpace", {
                            username: this.player.username,
                            spaceName: "St. Charles Place"
                        });
                    }
                },
                {
                    content: ["Bank pays you dividend of $50"],
                    action: () => {
                        this.$store.dispatch("credit", {
                            username: this.player.username,
                            amount: 50
                        });
                    }
                },
                {
                    content: [
                        "Get out of Jail free",
                        "This card may be kept until needed, or traded/sold"
                    ],
                    action: () => {
                        this.$store.dispatch("addJailPass", this.player.username);
                    }
                },
                {
                    content: ["Go back 3 spaces"],
                    action: () => {
                        this.$store.dispatch("movePlayerToSpace", {
                            username: this.player.username,
                            spaceName: "St. Charles Place"
                        });
                    }
                },
                {
                    content: [
                        "Go directly to Jail",
                        "Do not pass Go",
                        "Do not collect $200"
                    ],
                    action: () => {
                        this.$store.dispatch("jailPlayer", this.player.username);
                    }
                },
                {
                    content: [
                        "Make general repairs on all your property",
                        "For each house pay $25",
                        "For each hotel $100"
                    ],
                    action: () => {}
                },
                {
                    content: ["Pay poor tax of $15"],
                    action: () => {
                        this.$store.dispatch("debit", {
                            username: this.player.username,
                            amount: 15
                        });
                    }
                },
                {
                    content: [
                        "Take a trip to Reading Railroad",
                        "If you pass Go, collect $200"
                    ],
                    action: () => {
                        this.$store.dispatch("movePlayerToSpace", {
                            username: this.player.username,
                            spaceName: "Reading Railroad"
                        });
                    }
                },
                {
                    content: ["Take a walk on the Boardwalk", "Advance to Boardwalk"],
                    action: () => {
                        this.$store.dispatch("movePlayerToSpace", {
                            username: this.player.username,
                            spaceName: "Boardwalk"
                        });
                    }
                },
                {
                    content: [
                        "You have been elected chairman of the board",
                        "Pay each player $50"
                    ],
                    action: () => {}
                },
                {
                    content: ["Your building loan matures", "Collect $150"],
                    action: () => {
                        this.$store.dispatch("credit", {
                            username: this.player.username,
                            amount: 150
                        });
                    }
                },
                {
                    content: ["You have won a crossword competition", "Collect $100"],
                    action: () => {
                        this.$store.dispatch("credit", {
                            username: this.player.username,
                            amount: 100
                        });
                    }
                }
            ]
        };
    },
    computed: {
        ...mapGetters({
            player: "getCurrentPlayer",
            random: "getRandomNumber"
        })
    },
    methods: {
        async popup() {
            const card = this.cards[Math.floor(this.random * this.cards.length)];
            await this.$swal({
                content: this.$strToHtml(
                    `<div class="flex flex-row justify-center p-4"><i class="fas fa-question fa-5x text-${
                        this.color
                    }"></i></div>
                <div class="swal-title text-${this.color}">${this.name}</div>
                <div class="flex flex-col text-center">
                <div class="flex flex-row justify-center text-xl py-1 font-medium">
                            <div>
                            ${card.content[0]}
                            </div>
                </div>
                <div class="flex flex-row justify-center text-lg py-2"><div>` +
                        card.content
                            .slice(1)
                            .join(
                                '</div></div><div class="flex flex-row justify-center text-lg py-2"><div>'
                            ) +
                        `</div></div></div>`
                ),
                className: "normal-case"
            });
            card.action();
        }
    }
};
</script>
