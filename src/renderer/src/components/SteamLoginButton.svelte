<script lang="ts">
  export let clientSteamId: string;
</script>

{#if !clientSteamId}
  <button
    on:click={async () => {
      await window.api.setStoreValue('steamId', null);
      await window.api.setStoreValue('token', null);
      window.api.promptSteamAuthentication();
    }}
    class="steambutton"
    ><span>Login With Steam</span>
    <div class="icon">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        fill="currentColor"
        class="bi bi-steam"
        viewBox="0 0 16 16"
      >
        <path
          d="M.329 10.333A8.01 8.01 0 0 0 7.99 16C12.414 16 16 12.418 16 8s-3.586-8-8.009-8A8.006 8.006 0 0 0 0 7.468l.003.006 4.304 1.769A2.2 2.2 0 0 1 5.62 8.88l1.96-2.844-.001-.04a3.046 3.046 0 0 1 3.042-3.043 3.046 3.046 0 0 1 3.042 3.043 3.047 3.047 0 0 1-3.111 3.044l-2.804 2a2.223 2.223 0 0 1-3.075 2.11 2.22 2.22 0 0 1-1.312-1.568L.33 10.333Z"
        />
        <path
          d="M4.868 12.683a1.715 1.715 0 0 0 1.318-3.165 1.7 1.7 0 0 0-1.263-.02l1.023.424a1.261 1.261 0 1 1-.97 2.33l-.99-.41a1.7 1.7 0 0 0 .882.84Zm3.726-6.687a2.03 2.03 0 0 0 2.027 2.029 2.03 2.03 0 0 0 2.027-2.029 2.03 2.03 0 0 0-2.027-2.027 2.03 2.03 0 0 0-2.027 2.027m2.03-1.527a1.524 1.524 0 1 1-.002 3.048 1.524 1.524 0 0 1 .002-3.048"
        />
      </svg>
    </div></button
  >
{/if}

<style>
  /* https://codepen.io/berkaltiok/pen/BKXWXW */

  .steambutton {
    display: block;
    background-color: #6f9f31;
    width: 270px;
    height: 50px;
    line-height: 50px;
    margin: auto;
    color: #fff;
    position: absolute;
    cursor: pointer;
    overflow: hidden;
    border-radius: 5px;
    border: none;
  }

  .steambutton span {
    font-family: 'Exo 2', sans-serif;
    font-weight: bold;
    letter-spacing: 0.1em;
    width: 75%;
    font-size: 14px;
    text-transform: uppercase;
    left: 0;
    -webkit-transition: all 0.25s cubic-bezier(0.31, -0.105, 0.43, 1.4);
    transition: all 0.25s cubic-bezier(0.31, -0.105, 0.43, 1.4);
  }

  .steambutton span,
  .steambutton .icon {
    display: block;
    height: 100%;
    text-align: center;
    position: absolute;
    top: 0;
  }

  .steambutton .icon svg {
    font-size: 30px;
    margin-top: 12px;
    line-height: 50px;
    -webkit-transition:
      all 0.25s cubic-bezier(0.31, -0.105, 0.43, 1.4),
      height 0.25s ease;
    transition:
      all 0.25s cubic-bezier(0.31, -0.105, 0.43, 1.4),
      height 0.25s ease;
  }

  .steambutton .icon {
    width: 25%;
    right: 0;
    -webkit-transition: all 0.25s cubic-bezier(0.31, -0.105, 0.43, 1.4);
    transition: all 0.25s cubic-bezier(0.31, -0.105, 0.43, 1.4);
  }

  .steambutton span,
  .steambutton .icon {
    display: block;
    height: 100%;
    text-align: center;
    position: absolute;
    top: 0;
  }

  svg {
    display: inline-block;
    font: normal normal normal 14px/1 FontAwesome;
    font-size: inherit;
    text-rendering: auto;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    transform: translate(0, 0);
  }

  .steambutton span:after {
    content: '';
    background-color: #5d8628;
    width: 2px;
    height: 70%;
    position: absolute;
    top: 15%;
    right: -1px;
  }

  .steambutton:hover span {
    left: -72%;
    opacity: 0;
  }

  .steambutton:hover .icon {
    width: 100%;
  }

  .steambutton:hover .icon svg {
    font-size: 45px;
  }
</style>
