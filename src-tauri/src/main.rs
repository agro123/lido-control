// Evita ventana de consola adicional en Windows en release. ¡NO ELIMINAR!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    lido_control_lib::run()
}
