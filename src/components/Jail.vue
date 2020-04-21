<template>
    <div class="space corner jail" :class="{ active: active }" @click="popup">
        <div class="just">Just</div>
        <div class="drawing">
            <div class="container">
                <div class="name">In</div>
                <div class="window">
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <i class="person far fa-frown-open"></i>
                </div>
                <div class="name">Jail</div>
            </div>
        </div>
        <div class="visiting">Visiting</div>
    </div>
</template>

<script>
import { mapGetters } from 'vuex';
export default {
    data() {
        return {
            price: 50,
            name: 'Jail',
            active: false
        };
    },
    computed: {
        ...mapGetters({
            player: 'getCurrentPlayer', // get players in jail
            position: 'getCurrentPlayerPosition'
        })
    },
    methods: {
        action() {},
        async popup() {
            await this.$swal({
                title: this.name,
                text:
                    'Get out after rolling doubles, paying $' +
                    this.price +
                    ' after 3 turns, or using a Get out of Jail Free card',
                className: 'normal-case'
            });
        }
    }
};
</script>
