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
        };
    },
    computed: {
        ...mapGetters({
            self: "getSelfAddress",
            player: "getCurrentPlayer",
            card: "getChance"
        })
    },
    methods: {
        async popup() {
            await this.$swal({
                content: this.$strToHtml(
                    `<div class="flex flex-row justify-center p-4"><i class="fas fa-question fa-5x text-${
                        this.color
                    }"></i></div>
                <div class="swal-title text-${this.color}">${this.name}</div>
                <div class="flex flex-col text-center">
                <div class="flex flex-row justify-center text-xl py-1 font-medium">
                            <div>
                            ${this.card.message.split('–')[0]}
                            </div>
                </div>
                <div class="flex flex-row justify-center text-lg py-2"><div>` +
                        this.card.message.split('–')
                            .slice(1)
                            .join(
                                '</div></div><div class="flex flex-row justify-center text-lg py-2"><div>'
                            ) +
                        `</div></div></div>`
                ),
                className: "normal-case"
            });
            if(this.self == this.player.id)
                this.$store.dispatch('drawCard', {address: this.player.id, type: 'chance'});
        }
    }
};
</script>
