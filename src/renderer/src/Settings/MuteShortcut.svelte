<script lang="ts">
  import { Button, ButtonGroup, Input, Label } from 'flowbite-svelte';
  import { type KeyCodeEvent, keyCodes, prettyPrintKey } from '@shared/types/keycodes';
  import settings from '@store/settings';

  let recordingCombo: boolean = false;
  let pressedKeys: KeyCodeEvent[] = [];

  let container;
  $: inputRef = container?.querySelector('input');

  $: storedPressedKeys = $settings.muteKeybind;

  $: if (storedPressedKeys) {
    pressedKeys = storedPressedKeys;
    if (inputRef) {
      setKeyboardText();
    }
  }

  $: if (inputRef) {
    setKeyboardText();
  }

  const setKeyboardText = (): void => {
    container.querySelector('input').value = pressedKeys
      .map(prettyPrintKey)
      .join(' + ')
      .toUpperCase();
  };

  function handleKeydown(e: KeyboardEvent): void {
    // console.log(`Key code: ${e.code}. Key thing : ${e.keyCode}`);

    if (recordingCombo) {
      if (e.code === 'Escape') {
        recordingCombo = false;
        pressedKeys = [];
        window.api.setSettingsValue('muteKeybind', []);
        setKeyboardText();
        return;
      }

      const key = keyCodes[e.code];
      if (key && !pressedKeys.some((_key) => _key.code === key.code)) {
        pressedKeys.push(key);
        if (key.code === 'CapsLock') {
          handleKeyup();
        }
      }
    }
  }

  function handleKeyup(): void {
    if (recordingCombo) {
      recordingCombo = false;
      setKeyboardText();
      window.api.setSettingsValue('muteKeybind', pressedKeys);
    }
  }

  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('keyup', handleKeyup);

  function toggleRecording(): void {
    recordingCombo = !recordingCombo;
    if (recordingCombo) {
      pressedKeys = [];
      inputRef?.focus();
      window.api.setSettingsValue('muteKeybind', []);
    }
  }
</script>

<div>
  <Label for="mic" class="mb-2 ">Toggle Mute Keybind:</Label>
  <ButtonGroup class="w-full border-none content ">
    <div class="content w-full" bind:this={container}>
      <Input class="select-none !rounded-e-none" readonly placeholder="No Keybind Set" />
    </div>

    <Button onclick={toggleRecording} color={recordingCombo ? 'rose' : 'dark'}>Record</Button>
  </ButtonGroup>
</div>
