import { defineStore } from 'pinia';

export const useModalStore = defineStore('modal', {
    state: () => ({
        showModal: false,
        showDebrisModal: false,
        showAboutModal: false,
    }),
    actions: {
        toggleModal(value: boolean) {
            this.showModal = value;
        },
        toggleDebrisModal(value: boolean) {
            this.showDebrisModal = value;
        },
        toggleAboutModal(value: boolean) {
            this.showAboutModal = value;
        },
    },
});
