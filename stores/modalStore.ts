import { defineStore } from 'pinia';

export const useModalStore = defineStore('modal', {
    state: () => ({
        showModal: false,
    }),
    actions: {
        toggleModal(value: boolean) {
            this.showModal = value;
        },
    },
});