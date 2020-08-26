export default function syncPlugin (connection) {
    return store => {
        const allowedActions = [
            'buyProperty',
            'rentProperty',
            'rentRailroad',
            'rentUtility',
            'mortgageProperty',
            'sellProperty',
            'rollDice',
            'drawCard',
            'nextPlayer',
            'jailPlayer',
            'incomeTax',
            'luxuryTax',
            'freeParking',
            'nextState',
        ]
        connection.on('data', data => {
            store.dispatch(data.type, data.payload)
        })
        connection.on('state', data => {
            store.dispatch('setState', data)
        })
        connection.on('newPlayer', data => {
            store.dispatch('newPlayer', data)
        })
        store.subscribeAction((action, state) => {
            if (allowedActions.includes(action.type) && state.state.players[state.state.currentPlayer.toNumber()].id == state.connection.getSigningAddress()) {
                connection.sendData({ type: 'vuex', data: action })
            }
        })
    }
}
