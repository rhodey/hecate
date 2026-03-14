use std::collections::VecDeque;
use std::io::{self, Read, Write};

const FRAME_SIZE: usize = 256;

fn main() -> io::Result<()> {
    let mut detector = earshot::Detector::default();

    let stdin = io::stdin();
    let mut stdin_lock = stdin.lock();
    let stdout = io::stdout();
    let mut stdout_lock = io::BufWriter::new(stdout.lock());

    let mut read_buf = [0_u8; 4096];
    let mut pending_byte: Option<u8> = None;
    let mut samples: VecDeque<i16> = VecDeque::with_capacity(FRAME_SIZE * 4);

    loop {
        let n = stdin_lock.read(&mut read_buf)?;
        if n == 0 {
            break;
        }

        for &byte in &read_buf[..n] {
            if let Some(low) = pending_byte.take() {
                samples.push_back(i16::from_le_bytes([low, byte]));
            } else {
                pending_byte = Some(byte);
            }
        }

        while samples.len() >= FRAME_SIZE {
            let frame: Vec<i16> = samples.drain(..FRAME_SIZE).collect();
            let prediction = detector.predict_i16(&frame);
            writeln!(stdout_lock, "{}", prediction)?;
        }

        stdout_lock.flush()?;
    }

    Ok(())
}
