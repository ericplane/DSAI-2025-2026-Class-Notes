```latex
% Example report using the provided template.
% Self-contained: includes a minimal .bib file via filecontents*.

\begin{filecontents*}{references.bib}
@misc{rfc793,
  author       = {Jon Postel},
  title        = {Transmission Control Protocol},
  year         = {1981},
  howpublished = {\url{https://www.rfc-editor.org/rfc/rfc793}},
  note         = {RFC 793}
}
@misc{rfc768,
  author       = {Jon Postel},
  title        = {User Datagram Protocol},
  year         = {1980},
  howpublished = {\url{https://www.rfc-editor.org/rfc/rfc768}},
  note         = {RFC 768}
}
@book{tanenbaum2011,
  author    = {Andrew S. Tanenbaum and David J. Wetherall},
  title     = {Computer Networks},
  edition   = {5},
  year      = {2011},
  publisher = {Pearson}
}
@book{stevens1994,
  author    = {W. Richard Stevens},
  title     = {TCP/IP Illustrated, Volume 1: The Protocols},
  year      = {1994},
  publisher = {Addison-Wesley}
}
\end{filecontents*}

\documentclass[a4paper,12pt]{article}
\frenchspacing
\usepackage{microtype}
\usepackage[pdfauthor={Andy B. Author},pdftitle={Transport Protocols: TCP vs UDP}]{hyperref}

\begin{document}

\title{Transport Protocols: TCP vs UDP}
\author{Andy B. Author}
\date{\today}
\maketitle

\section{Introduction}

This report surveys the two dominant Internet transport protocols: TCP and UDP. It outlines design goals, core mechanisms, typical use cases, and performance trade-offs, referencing the base specifications~\cite{rfc793,rfc768} and standard texts for context~\cite[Chapter 2]{tanenbaum2011,stevens1994}. The remainder: Section~\ref{sec:mechanics} covers mechanics. Section~\ref{another} gives a small measurement example. Section~\ref{sec:conclusion} states conclusions.

\section{Protocol mechanics}\label{sec:mechanics}

\subsection{TCP essentials}

TCP provides a reliable, byte-stream abstraction atop IP~\cite{rfc793}. Key elements:
\begin{itemize}
  \item \textbf{Connection setup:} Three-way handshake establishes sequence spaces.
  \item \textbf{Reliability:} Positive acknowledgments and retransmissions with timers.
  \item \textbf{Flow control:} Receiver-advertised window limits in-flight data.
  \item \textbf{Congestion control:} Slow start, congestion avoidance, fast retransmit/fast recovery (modern stacks add CUBIC/BBR; see \cite{stevens1994} for classical behavior).
\end{itemize}

\paragraph{Latency components.} A simple decomposition:
\[
  \text{RTT} \approx 2\cdot d_p + 2\cdot t_s,\quad
  t_s=\frac{L}{R}
\]
where $d_p$ is one-way propagation delay, $t_s$ serialization delay for packet length $L$ and link rate $R$.

\subsection{UDP essentials}

UDP offers message-oriented, best-effort delivery with minimal header overhead~\cite{rfc768}. No reliability, ordering, or congestion control is built-in. Applications add what they need or accept loss.

\subsection{When to choose which}

\begin{itemize}
  \item \textbf{TCP} for correctness-critical transfers: web pages, APIs, file sync.
  \item \textbf{UDP} for latency-sensitive or app-controlled reliability: real-time voice/video, gaming, DNS, custom QUIC-like transports.
\end{itemize}

\subsection{Illustrative pseudo-interfaces}

In some sections you might want to give examples like this:
\begin{verbatim}
TRANSPORT CLASS TCP;
  BEGIN
    ensures ordered, reliable byte stream;
    implements flow + congestion control;
  END;
TRANSPORT CLASS UDP;
  BEGIN
    sends datagrams without delivery guarantees;
    app may implement its own control logic;
  END;
\end{verbatim}

\section{Second section: toy measurement}\label{another}

Table~\ref{sometable} shows a toy snapshot: measured loss fraction $x$ and achieved application throughput $V$ (Gb/s) for a UDP-like flow with simple rate limiting on a lab link. Values are illustrative.

\begin{table}[!ht]
\begin{center}
\begin{tabular}{|lc|}
\hline
$x$ & $V$\\
\hline
0.00441 & 0.00308 \\
0.00216 & 0.00213 \\
0.00036 & 0.00186 \\
0.00238 & 0.00132 \\
\hline
\end{tabular}
\end{center}
\caption{Every table needs a caption.}\label{sometable}
\end{table}

Observation: as $x$ increases, $V$ falls due to retransmission or application-level backoff. TCP would also reduce its congestion window under similar conditions~\cite{stevens1994}.

\section{Conclusions}\label{sec:conclusion}

TCP prioritizes reliability and fairness across flows. UDP prioritizes simplicity and timing control. Choose TCP when correctness and in-order delivery dominate. Choose UDP when end-to-end timing and custom control dominate, and implement congestion awareness in the application to remain network-friendly.

\section{Writing approach and substantiation}

Approach: define the selection criteria (reliability, ordering, latency), map those to protocol mechanisms, then support claims with the base RFCs~\cite{rfc793,rfc768} and standard references~\cite{tanenbaum2011,stevens1994}. A generative writing tool assisted with drafting; the author curated structure, inserted equations, and verified terminology against cited sources.

% the bibliography
\bibliographystyle{plain}
\bibliography{references}

\end{document}
```

[](https://www.overleaf.com/project/687e4120b99c3eaa0fba9350)