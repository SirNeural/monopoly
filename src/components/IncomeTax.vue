<template>
    <div class="space fee income-tax" :class="{ active: active }" @click="popup">
        <div class="container">
            <div class="name">{{ name }}</div>
            <div class="diamond"></div>
            <div class="instructions">Pay 10%<br />or<br />${{ price }}</div>
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            price: 200,
            name: 'Income Tax',
            active: false
        };
    },
    methods: {
        action() {},
        async popup() {
            await this.$swal({
                title: this.name,
                text: 'Pay 10% of net worth or $' + this.price,
                className: 'normal-case',
                icon: 'warning'
            });
            this.action();
        }
    }
};
</script>
