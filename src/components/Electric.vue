<template>
    <div
        class="space utility electric-company"
        :class="{ active: active }"
        @click="popup"
    >
        <div class="container">
            <div class="name">{{ name }}</div>
            <div><i :class="`drawing far fa-lightbulb text-${this.color}`"></i></div>
            <div class="price">Buy: ${{ price }}</div>
        </div>
    </div>
</template>

<script>
import { mapGetters } from 'vuex';
export default {
    data() {
        return {
            price: 150,
            mortgage: 75,
            name: 'Electric Company',
            color: 'yellow-600',
            active: false,
            owner: false
        };
    },
    computed: {
        ...mapGetters(['getLastRoll']),
        rent() {
            return this.getLastRoll * 4;
        }
    },
    methods: {
        action() {},
        async popup() {
            await this.$swal({
                content: this.$strToHtml(`
                <div class="flex flex-row justify-center p-4"><i class="far fa-lightbulb fa-5x text-${
                    this.color
                }"></i></div>
                <div class="swal-title text-${this.color}">${this.name} - $${
                    this.price
                }</div>
                <div class="flex flex-col text-center">
                            <div class="flex flex-row justify-between text-lg">
                            If one "Utility" is owned, rent is 4 times amount shown on dice.
                            </div>
                            <div class="flex flex-row justify-between text-lg py-1">
                            If both "Utilities" are owned, rent is 10 times amount shown on dice.
                            </div>
                            <div class="flex flex-row justify-center py-1 text-lg font-medium">
                            <div class="pr-4">
                            Mortgage Value:
                            </div>
                            <div>$${this.mortgage}</div>
                            </div>
                            </div>`),
                className: 'normal-case',
                buttons: {
                    cancel: this.owner ? 'Manage' : 'Auction',
                    [this.owner ? 'rent' : 'buy']: true
                }
            });
            this.action();
        }
    }
};
</script>
